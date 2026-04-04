"""CO2 Tracker Lambda handler.

Endpoints:
- GET /api/co2/transaction/{transaction_id} — CO2 saved for a transaction
- GET /api/co2/cumulative                   — Cumulative CO2 savings for user
"""

from __future__ import annotations

import logging
import os
from typing import Any

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

TRANSACTIONS_TABLE = os.environ.get("TRANSACTIONS_TABLE", "")
ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")
CONSUMPTION_PROFILES_TABLE = os.environ.get("CONSUMPTION_PROFILES_TABLE", "")

# CO2 estimates by category (kg saved vs buying new)
CO2_ESTIMATES: dict[str, float] = {
    "electronics": 15.0,
    "furniture": 25.0,
    "clothing": 5.0,
    "books": 2.0,
}
CO2_DEFAULT: float = 10.0


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/co2/transaction/{transaction_id}" and http_method == "GET":
            return _handle_transaction_co2(event)
        elif resource == "/api/co2/cumulative" and http_method == "GET":
            return _handle_cumulative(event)
        else:
            return error_response(
                ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}"
            )
    except Exception:
        logger.exception("Unhandled error in co2_tracker handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── CO2 Calculation Logic ────────────────────────────────────────────────


def calculate_co2_saved(item_category: str, action_type: str) -> float:
    """Estimate CO2 saved compared to buying new.

    For borrow and buy_resale actions, CO2 saved is positive based on
    the item category. For buy_new, CO2 saved is 0.

    Args:
        item_category: Item category (electronics, furniture, etc.).
        action_type: Transaction type (borrow, buy_resale, buy_new).

    Returns:
        Estimated CO2 saved in kg.
    """
    if action_type == "buy_new":
        return 0.0
    if action_type in ("borrow", "buy_resale"):
        return CO2_ESTIMATES.get(item_category.lower(), CO2_DEFAULT)
    return 0.0


def get_cumulative_savings(user_id: str) -> dict[str, Any]:
    """Read cumulative CO2 and money savings from the Consumption Profiles table.

    Args:
        user_id: The authenticated user identifier.

    Returns:
        Success response with total_co2_saved_kg and total_money_saved.
    """
    table = get_dynamo_table(CONSUMPTION_PROFILES_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    profile = result.get("Item")

    if not profile:
        return success_response({
            "user_id": user_id,
            "total_co2_saved_kg": 0.0,
            "total_money_saved": 0.0,
        })

    return success_response({
        "user_id": user_id,
        "total_co2_saved_kg": float(profile.get("total_co2_saved_kg", 0)),
        "total_money_saved": float(profile.get("total_money_saved", 0)),
    })


# ── API Gateway Handlers ────────────────────────────────────────────────


def _handle_transaction_co2(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/co2/transaction/{transaction_id}."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    path_params = event.get("pathParameters") or {}
    transaction_id = path_params.get("transaction_id")
    if not transaction_id:
        return error_response(
            ErrorCode.VALIDATION_ERROR, "Missing path parameter: transaction_id"
        )

    # Look up the transaction
    txn_table = get_dynamo_table(TRANSACTIONS_TABLE)
    txn_result = txn_table.get_item(Key={"transaction_id": transaction_id})
    transaction = txn_result.get("Item")
    if not transaction:
        return error_response(ErrorCode.NOT_FOUND, f"Transaction not found: {transaction_id}")

    # Get the item to determine category
    item_id = transaction.get("item_id", "")
    items_table = get_dynamo_table(ITEMS_TABLE)
    item_result = items_table.get_item(Key={"item_id": item_id})
    item = item_result.get("Item")

    category = item.get("category", "").lower() if item else ""
    action_type = transaction.get("type", "")
    co2_saved = calculate_co2_saved(category, action_type)

    return success_response({
        "transaction_id": transaction_id,
        "item_id": item_id,
        "category": category,
        "action_type": action_type,
        "co2_saved_kg": co2_saved,
    })


def _handle_cumulative(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/co2/cumulative."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    return get_cumulative_savings(user_id)


# ── Helpers ──────────────────────────────────────────────────────────────


def _get_user_id(event: dict[str, Any]) -> str | None:
    """Extract user_id from the authorizer context or query params."""
    auth_context = event.get("requestContext", {}).get("authorizer", {})
    user_id = auth_context.get("principalId")
    if user_id and user_id != "user":
        return user_id

    params = event.get("queryStringParameters") or {}
    return params.get("user_id")
