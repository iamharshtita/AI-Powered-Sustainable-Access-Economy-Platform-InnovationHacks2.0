"""Decision Engine Lambda handler.

Endpoints:
- GET /api/recommendations/{item_id} — Get AI recommendation for an item
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3

from shared.response import success_response, error_response, ErrorCode

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

USERS_TABLE = os.environ.get("USERS_TABLE", "")
ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")
TRANSACTIONS_TABLE = os.environ.get("TRANSACTIONS_TABLE", "")
AI_SERVICE_SECRET_ARN = os.environ.get("AI_SERVICE_SECRET_ARN", "")

# CO2 estimates by category (kg saved vs buying new)
CO2_ESTIMATES: dict[str, float] = {
    "electronics": 15.0,
    "furniture": 25.0,
    "clothing": 5.0,
    "books": 2.0,
}
CO2_DEFAULT = 10.0

# Cached AI API key (per Lambda cold-start)
_ai_key_cache: str | None = None


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/recommendations/{item_id}" and http_method == "GET":
            return _handle_get_recommendation(event)
        else:
            return error_response(
                ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}"
            )
    except Exception:
        logger.exception("Unhandled error in decision_engine handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Recommendation Logic ─────────────────────────────────────────────────


def get_recommendation(user_id: str, item_id: str) -> dict[str, Any]:
    """Evaluate user history and item data to produce a recommendation.

    Rule-based logic (hackathon):
    - If user has borrowed this category before → recommend borrow
    - If item condition is "new" or "like_new" → recommend buy_resale
    - Default → recommend borrow (most sustainable)

    When AI service is unavailable, returns all three options.

    Args:
        user_id: Authenticated user identifier.
        item_id: Item to evaluate.

    Returns:
        Success response with recommendation, explanation, and co2_saved.
    """
    if not user_id or not user_id.strip():
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: user_id")
    if not item_id or not item_id.strip():
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: item_id")

    # Fetch item data
    item = _get_item(item_id)
    if item is None:
        return error_response(ErrorCode.NOT_FOUND, f"Item not found: {item_id}")

    category = item.get("category", "").lower()
    condition = item.get("condition", "").lower()
    co2_saved = CO2_ESTIMATES.get(category, CO2_DEFAULT)

    # Check if AI service is available
    ai_available = _is_ai_service_available()

    if not ai_available:
        return success_response({
            "recommendation": None,
            "options": ["borrow", "buy_resale", "buy_new"],
            "explanation": "AI recommendations temporarily unavailable",
            "co2_saved": co2_saved,
        })

    # Fetch user transaction history
    user_transactions = _get_user_transactions(user_id)
    has_borrowed_category = _has_borrowed_category(user_transactions, category)

    # Rule-based recommendation
    if has_borrowed_category:
        return success_response({
            "recommendation": "borrow",
            "explanation": f"You've borrowed {category} items before — borrowing is the most sustainable choice.",
            "co2_saved": co2_saved,
        })
    elif condition in ("new", "like_new"):
        return success_response({
            "recommendation": "buy_resale",
            "explanation": f"This {category} item is in {condition} condition — buying resale saves CO2 while getting a quality product.",
            "co2_saved": co2_saved,
        })
    else:
        return success_response({
            "recommendation": "borrow",
            "explanation": f"Borrowing this {category} item is the most sustainable option and saves {co2_saved}kg of CO2.",
            "co2_saved": co2_saved,
        })


# ── Sentient Listing Narration ───────────────────────────────────────────


def generate_sentient_narration(listing: dict[str, Any]) -> str:
    """Generate a first-person narration for a listing.

    Template-based approach for hackathon (no actual LLM call).

    Args:
        listing: Dict with title, category, condition, description.

    Returns:
        A first-person narration string.
    """
    title = listing.get("title", "an item")
    category = listing.get("category", "thing")
    condition = listing.get("condition", "good")
    description = listing.get("description", "")

    narration = (
        f"Hi, I'm a {condition} {category} called {title}. "
        f"{description}. I'd love to find a new home!"
    )
    return narration


# ── API Gateway Handler ──────────────────────────────────────────────────


def _handle_get_recommendation(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/recommendations/{item_id}."""
    path_params = event.get("pathParameters") or {}
    item_id = path_params.get("item_id")
    if not item_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing path parameter: item_id")

    # Extract user_id from authorizer context or query params
    user_id = _extract_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "User not authenticated")

    return get_recommendation(user_id, item_id)


def _extract_user_id(event: dict[str, Any]) -> str | None:
    """Extract user_id from authorizer context or query string parameters."""
    # Try authorizer context first
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    user_id = authorizer.get("principalId") or authorizer.get("user_id")
    if user_id and user_id != "user":
        return user_id

    # Fall back to query string parameters
    query_params = event.get("queryStringParameters") or {}
    return query_params.get("user_id")


# ── Data Access Helpers ──────────────────────────────────────────────────


def _get_item(item_id: str) -> dict[str, Any] | None:
    """Fetch an item from the Items table."""
    if not ITEMS_TABLE:
        logger.error("ITEMS_TABLE not configured")
        return None
    try:
        from shared.dynamo import get_dynamo_table
        table = get_dynamo_table(ITEMS_TABLE)
        response = table.get_item(Key={"item_id": item_id})
        return response.get("Item")
    except Exception:
        logger.exception("Failed to fetch item %s", item_id)
        return None


def _get_user_transactions(user_id: str) -> list[dict[str, Any]]:
    """Fetch user transactions from the Transactions table using user-index GSI."""
    if not TRANSACTIONS_TABLE:
        logger.error("TRANSACTIONS_TABLE not configured")
        return []
    try:
        from shared.dynamo import get_dynamo_table
        table = get_dynamo_table(TRANSACTIONS_TABLE)
        response = table.query(
            IndexName="user-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("user_id").eq(user_id),
        )
        return response.get("Items", [])
    except Exception:
        logger.exception("Failed to fetch transactions for user %s", user_id)
        return []


def _has_borrowed_category(
    transactions: list[dict[str, Any]], category: str
) -> bool:
    """Check if any transaction is a borrow in the given category."""
    for txn in transactions:
        if txn.get("type") == "borrow" and txn.get("category", "").lower() == category:
            return True
    return False


def _is_ai_service_available() -> bool:
    """Check if the AI service API key is configured and retrievable.

    For the hackathon, we use rule-based logic, so this just checks
    whether the secret ARN is configured. Returns True to use rule-based
    recommendations; returns False only when we want to signal degradation.
    """
    # For hackathon: always return True to use rule-based logic
    # In production, this would verify the AI service key is available
    if not AI_SERVICE_SECRET_ARN:
        return False
    return True


def _get_ai_api_key() -> str | None:
    """Retrieve the AI service API key from Secrets Manager."""
    global _ai_key_cache
    if _ai_key_cache is not None:
        return _ai_key_cache

    if not AI_SERVICE_SECRET_ARN:
        return None

    try:
        client = boto3.client("secretsmanager")
        response = client.get_secret_value(SecretId=AI_SERVICE_SECRET_ARN)
        secret = json.loads(response["SecretString"])
        _ai_key_cache = secret.get("api_key")
        return _ai_key_cache
    except Exception:
        logger.exception("Failed to retrieve AI service API key")
        return None
