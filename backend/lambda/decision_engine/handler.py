"""Decision Engine Lambda handler.

Endpoints:
- GET /api/recommendations/{item_id} — Get AI recommendation for an item

Uses Amazon Bedrock (Nova Lite) for LLM-powered recommendations
and sentient listing narrations.
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
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

# CO2 estimates by category (kg saved vs buying new)
CO2_ESTIMATES: dict[str, float] = {
    "electronics": 15.0,
    "furniture": 25.0,
    "clothing": 5.0,
    "books": 2.0,
}
CO2_DEFAULT = 10.0

# Cached Bedrock client (per Lambda cold-start)
_bedrock_client: Any = None


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


# ── Bedrock LLM Helper ──────────────────────────────────────────────────


def _get_bedrock_client() -> Any:
    """Return a cached Bedrock Runtime client."""
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client("bedrock-runtime")
    return _bedrock_client


def _call_bedrock(prompt: str, max_tokens: int = 300) -> str | None:
    """Call Amazon Bedrock Nova Lite via the Converse API.

    Args:
        prompt: The user prompt to send.
        max_tokens: Maximum tokens in the response.

    Returns:
        The model's text response, or None on failure.
    """
    try:
        client = _get_bedrock_client()
        response = client.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[
                {"role": "user", "content": [{"text": prompt}]},
            ],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.7},
        )
        output = response.get("output", {})
        message = output.get("message", {})
        content = message.get("content", [])
        if content and content[0].get("text"):
            return content[0]["text"].strip()
        return None
    except Exception:
        logger.exception("Bedrock call failed")
        return None


# ── Recommendation Logic ─────────────────────────────────────────────────


def get_recommendation(user_id: str, item_id: str) -> dict[str, Any]:
    """Evaluate user history and item data using Bedrock LLM.

    Sends user context and item data to Nova Lite to get a personalized
    recommendation (borrow, buy_resale, or buy_new) with explanation.

    Falls back to all three options if Bedrock is unavailable.

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
    title = item.get("title", "")
    description = item.get("description", "")
    co2_saved = CO2_ESTIMATES.get(category, CO2_DEFAULT)

    # Fetch user transaction history
    user_transactions = _get_user_transactions(user_id)
    borrow_count = sum(1 for t in user_transactions if t.get("type") == "borrow")
    purchase_count = sum(1 for t in user_transactions if t.get("type") in ("buy_resale", "buy_new"))
    category_borrows = sum(
        1 for t in user_transactions
        if t.get("type") == "borrow" and t.get("category", "").lower() == category
    )

    # Build the LLM prompt
    prompt = _build_recommendation_prompt(
        title=title,
        category=category,
        condition=condition,
        description=description,
        co2_saved=co2_saved,
        borrow_count=borrow_count,
        purchase_count=purchase_count,
        category_borrows=category_borrows,
    )

    # Call Bedrock
    llm_response = _call_bedrock(prompt, max_tokens=200)

    if not llm_response:
        # Graceful degradation — return all options
        return success_response({
            "recommendation": None,
            "options": ["borrow", "buy_resale", "buy_new"],
            "explanation": "AI recommendations temporarily unavailable",
            "co2_saved": co2_saved,
        })

    # Parse the LLM response
    recommendation, explanation = _parse_recommendation(llm_response)

    # Validate recommendation
    if recommendation not in ("borrow", "buy_resale", "buy_new"):
        recommendation = "borrow"  # default to most sustainable

    # CO2 is 0 for buy_new
    final_co2 = 0.0 if recommendation == "buy_new" else co2_saved

    return success_response({
        "recommendation": recommendation,
        "explanation": explanation,
        "co2_saved": final_co2,
    })


def _build_recommendation_prompt(
    title: str, category: str, condition: str, description: str,
    co2_saved: float, borrow_count: int, purchase_count: int, category_borrows: int,
) -> str:
    """Build the prompt for the recommendation LLM call."""
    return f"""You are a sustainability advisor for a sharing economy platform. 
Analyze the following and recommend ONE action: "borrow", "buy_resale", or "buy_new".

Item: {title}
Category: {category}
Condition: {condition}
Description: {description}
CO2 saved by borrowing/resale: {co2_saved}kg

User history:
- Total borrows: {borrow_count}
- Total purchases: {purchase_count}
- Times borrowed {category}: {category_borrows}

Rules:
- Prioritize sustainability (borrowing saves the most CO2)
- If user frequently borrows this category, recommend borrow
- If item is in new/like_new condition and user hasn't borrowed this category, buy_resale is good
- Only recommend buy_new if there's a strong reason

Respond in EXACTLY this format (2 lines only):
RECOMMENDATION: <borrow|buy_resale|buy_new>
EXPLANATION: <one sentence explanation>"""


def _parse_recommendation(llm_response: str) -> tuple[str, str]:
    """Parse the LLM response into recommendation and explanation."""
    recommendation = "borrow"
    explanation = llm_response

    for line in llm_response.split("\n"):
        line = line.strip()
        if line.upper().startswith("RECOMMENDATION:"):
            rec = line.split(":", 1)[1].strip().lower()
            if rec in ("borrow", "buy_resale", "buy_new"):
                recommendation = rec
        elif line.upper().startswith("EXPLANATION:"):
            explanation = line.split(":", 1)[1].strip()

    return recommendation, explanation


# ── Sentient Listing Narration ───────────────────────────────────────────


def generate_sentient_narration(listing: dict[str, Any]) -> str:
    """Generate a first-person narration for a listing using Bedrock LLM.

    Args:
        listing: Dict with title, category, condition, description.

    Returns:
        A first-person narration string.
    """
    title = listing.get("title", "an item")
    category = listing.get("category", "thing")
    condition = listing.get("condition", "good")
    description = listing.get("description", "")

    prompt = f"""You are a {condition} {category} called "{title}". 
Describe yourself in first person in 2-3 sentences. Be friendly and engaging.
Mention your condition and why someone should borrow or buy you.
Here's your description: {description}

Respond ONLY with the narration, nothing else. Start with "Hi, I'm"."""

    narration = _call_bedrock(prompt, max_tokens=150)

    if not narration:
        # Fallback to template
        return (
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

    user_id = _extract_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "User not authenticated")

    return get_recommendation(user_id, item_id)


def _extract_user_id(event: dict[str, Any]) -> str | None:
    """Extract user_id from authorizer context or query string parameters."""
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    user_id = authorizer.get("principalId") or authorizer.get("user_id")
    if user_id and user_id != "user":
        return user_id

    query_params = event.get("queryStringParameters") or {}
    return query_params.get("user_id")


# ── Data Access Helpers ──────────────────────────────────────────────────


def _get_item(item_id: str) -> dict[str, Any] | None:
    """Fetch an item from the Items table."""
    if not ITEMS_TABLE:
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
    """Fetch user transactions from the Transactions table."""
    if not TRANSACTIONS_TABLE:
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
