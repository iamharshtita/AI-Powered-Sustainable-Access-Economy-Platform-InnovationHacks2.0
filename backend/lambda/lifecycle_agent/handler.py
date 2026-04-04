"""Lifecycle Agent Lambda handler.

Endpoints:
- GET /api/nudges       — Get active nudges for the authenticated user
- GET /api/suggestions  — Get buy suggestions based on repeat borrowing
"""

from __future__ import annotations

import json
import logging
import os
from decimal import Decimal
from typing import Any

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

import boto3.dynamodb.conditions

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EVENTS_TABLE = os.environ.get("EVENTS_TABLE", "")
CONSUMPTION_PROFILES_TABLE = os.environ.get("CONSUMPTION_PROFILES_TABLE", "")
ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")
TRANSACTIONS_TABLE = os.environ.get("TRANSACTIONS_TABLE", "")

BUY_SUGGESTION_THRESHOLD = 3

# Average borrow cost per day by category (₹) — used for cost comparison
DEFAULT_BORROW_COST_PER_DAY: dict[str, float] = {
    "electronics": 50.0,
    "furniture": 30.0,
    "clothing": 20.0,
    "books": 10.0,
}
DEFAULT_BORROW_COST_FALLBACK = 25.0

# Average purchase cost by category (₹)
DEFAULT_PURCHASE_COST: dict[str, float] = {
    "electronics": 5000.0,
    "furniture": 8000.0,
    "clothing": 1500.0,
    "books": 500.0,
}
DEFAULT_PURCHASE_COST_FALLBACK = 3000.0

# Average borrow duration in days (for cost projection)
AVG_BORROW_DURATION_DAYS = 7


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/nudges" and http_method == "GET":
            return _handle_get_nudges(event)
        elif resource == "/api/suggestions" and http_method == "GET":
            return _handle_get_suggestions(event)
        else:
            return error_response(
                ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}"
            )
    except Exception:
        logger.exception("Unhandled error in lifecycle_agent handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Core Logic ───────────────────────────────────────────────────────────


def get_borrow_frequency(user_id: str, category: str) -> int:
    """Count how many times a user has borrowed in a given category.

    Reads category_borrow_counts from the Consumption Profiles table.

    Args:
        user_id: The user identifier.
        category: Item category to check.

    Returns:
        Borrow count for the category (0 if no profile or category not found).
    """
    table = get_dynamo_table(os.environ.get("CONSUMPTION_PROFILES_TABLE", ""))
    result = table.get_item(Key={"user_id": user_id})
    profile = result.get("Item")
    if not profile:
        return 0

    counts = profile.get("category_borrow_counts", {})
    count = counts.get(category, 0)
    return int(count)


def generate_buy_suggestion(user_id: str, category: str) -> dict[str, Any] | None:
    """Generate a buy suggestion if borrow count >= threshold for a category.

    When triggered, includes a cost comparison between continued borrowing
    and purchasing outright.

    Args:
        user_id: The user identifier.
        category: Item category to evaluate.

    Returns:
        Dict with category, borrow_count, continued_borrowing_cost,
        purchase_cost, and suggestion message. None if below threshold.
    """
    borrow_count = get_borrow_frequency(user_id, category)

    if borrow_count < BUY_SUGGESTION_THRESHOLD:
        return None

    borrow_cost_per_day = DEFAULT_BORROW_COST_PER_DAY.get(
        category, DEFAULT_BORROW_COST_FALLBACK
    )
    purchase_cost = DEFAULT_PURCHASE_COST.get(
        category, DEFAULT_PURCHASE_COST_FALLBACK
    )

    # Project continued borrowing cost for next 12 months (assume 1 borrow/month)
    continued_borrowing_cost = round(
        borrow_cost_per_day * AVG_BORROW_DURATION_DAYS * 12, 2
    )

    suggestion = (
        f"You've borrowed {category} items {borrow_count} times. "
        f"Continued borrowing would cost ~₹{continued_borrowing_cost}/year, "
        f"while purchasing costs ~₹{purchase_cost}. "
        f"Consider buying to save in the long run."
    )

    return {
        "category": category,
        "borrow_count": borrow_count,
        "continued_borrowing_cost": continued_borrowing_cost,
        "purchase_cost": purchase_cost,
        "suggestion": suggestion,
    }


def generate_nudge(user_id: str, item_id: str) -> dict[str, Any] | None:
    """Detect unnecessary purchasing patterns and return a nudge message.

    A nudge is generated when a user is purchasing in a category where
    borrowing options exist and the user has not previously borrowed in
    that category.

    Args:
        user_id: The user identifier.
        item_id: The item the user intends to purchase.

    Returns:
        Dict with nudge message and metadata, or None if no nudge needed.
    """
    # Fetch item to determine category
    item = _get_item(item_id)
    if not item:
        return None

    category = item.get("category", "").lower()
    if not category:
        return None

    # Check if user has borrowed in this category before
    borrow_count = get_borrow_frequency(user_id, category)
    if borrow_count > 0:
        # User already borrows in this category — no nudge needed
        return None

    # Check if borrowing options exist in this category
    borrowable_items = _get_borrowable_items_in_category(category)
    if not borrowable_items:
        # No borrowing options available — no nudge
        return None

    # Calculate potential savings
    borrow_cost_per_day = DEFAULT_BORROW_COST_PER_DAY.get(
        category, DEFAULT_BORROW_COST_FALLBACK
    )
    annual_borrow_cost = round(
        borrow_cost_per_day * AVG_BORROW_DURATION_DAYS * 12, 2
    )
    purchase_cost = DEFAULT_PURCHASE_COST.get(
        category, DEFAULT_PURCHASE_COST_FALLBACK
    )
    savings = round(purchase_cost - annual_borrow_cost, 2)

    if savings > 0:
        message = f"You'll save ₹{savings} annually by borrowing {category} items instead of buying."
    else:
        message = f"You don't need this — consider borrowing {category} items instead."

    return {
        "nudge": message,
        "category": category,
        "item_id": item_id,
        "borrowable_count": len(borrowable_items),
    }


# ── API Gateway Handlers ─────────────────────────────────────────────────


def _handle_get_nudges(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/nudges.

    Returns nudges for items the user has recently viewed or is about to buy.
    Accepts optional item_id query param to check a specific item.
    """
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    query_params = event.get("queryStringParameters") or {}
    item_id = query_params.get("item_id")

    nudges: list[dict[str, Any]] = []

    if item_id:
        nudge = generate_nudge(user_id, item_id)
        if nudge:
            nudges.append(nudge)
    else:
        # Get recent purchase events and generate nudges for those items
        recent_items = _get_recent_purchase_items(user_id)
        for rid in recent_items:
            nudge = generate_nudge(user_id, rid)
            if nudge:
                nudges.append(nudge)

    return success_response({"nudges": nudges})


def _handle_get_suggestions(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/suggestions.

    Returns buy suggestions for all categories where the user has
    borrowed >= threshold times.
    """
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    # Fetch consumption profile to get all category borrow counts
    table = get_dynamo_table(os.environ.get("CONSUMPTION_PROFILES_TABLE", ""))
    result = table.get_item(Key={"user_id": user_id})
    profile = result.get("Item")

    suggestions: list[dict[str, Any]] = []
    if profile:
        counts = profile.get("category_borrow_counts", {})
        for category, count in counts.items():
            if int(count) >= BUY_SUGGESTION_THRESHOLD:
                suggestion = generate_buy_suggestion(user_id, category)
                if suggestion:
                    suggestions.append(suggestion)

    return success_response({"suggestions": suggestions})


# ── Helpers ──────────────────────────────────────────────────────────────


def _get_user_id(event: dict[str, Any]) -> str | None:
    """Extract user_id from the authorizer context or query params."""
    auth_context = event.get("requestContext", {}).get("authorizer", {})
    user_id = auth_context.get("principalId")
    if user_id and user_id != "user":
        return user_id

    params = event.get("queryStringParameters") or {}
    return params.get("user_id")


def _get_item(item_id: str) -> dict[str, Any] | None:
    """Fetch an item from the Items table."""
    items_table = os.environ.get("ITEMS_TABLE", "")
    if not items_table:
        logger.error("ITEMS_TABLE not configured")
        return None
    try:
        table = get_dynamo_table(items_table)
        response = table.get_item(Key={"item_id": item_id})
        return response.get("Item")
    except Exception:
        logger.exception("Failed to fetch item %s", item_id)
        return None


def _get_borrowable_items_in_category(category: str) -> list[dict[str, Any]]:
    """Query Items table for active items in a category (borrowing options)."""
    items_table = os.environ.get("ITEMS_TABLE", "")
    if not items_table:
        return []
    try:
        table = get_dynamo_table(items_table)
        response = table.query(
            IndexName="category-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("category").eq(category),
            FilterExpression=boto3.dynamodb.conditions.Attr("status").eq("active"),
            Limit=10,
        )
        return response.get("Items", [])
    except Exception:
        logger.exception("Failed to query borrowable items for category %s", category)
        return []


def _get_recent_purchase_items(user_id: str) -> list[str]:
    """Get item IDs from recent purchase-related events for the user."""
    events_table = os.environ.get("EVENTS_TABLE", "")
    if not events_table:
        return []
    try:
        table = get_dynamo_table(events_table)
        response = table.query(
            IndexName="user-event-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("user_id").eq(user_id),
            ScanIndexForward=False,
            Limit=20,
        )
        items = response.get("Items", [])
        item_ids: list[str] = []
        seen: set[str] = set()
        for evt in items:
            if evt.get("event_type") in ("buy", "view"):
                iid = evt.get("item_id", "")
                if iid and iid not in seen:
                    item_ids.append(iid)
                    seen.add(iid)
        return item_ids[:5]
    except Exception:
        logger.exception("Failed to fetch recent events for user %s", user_id)
        return []
