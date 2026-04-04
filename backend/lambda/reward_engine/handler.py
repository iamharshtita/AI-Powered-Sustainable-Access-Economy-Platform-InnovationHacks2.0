"""Reward Engine Lambda handler.

Endpoints:
- POST /api/rewards/award    — Award points for a transaction
- POST /api/rewards/redeem   — Redeem points for a discount
- POST /api/rewards/deduct   — Deduct points on cancellation
- GET  /api/rewards/balance   — Get current reward point balance
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

USERS_TABLE = os.environ.get("USERS_TABLE", "")
TRANSACTIONS_TABLE = os.environ.get("TRANSACTIONS_TABLE", "")

# Points awarded per action type
POINTS_MAP: dict[str, int] = {
    "borrow": 50,
    "resale_purchase": 30,
}

# Redemption rate: 100 points = ₹10 discount
POINTS_PER_DISCOUNT_UNIT = 100
DISCOUNT_PER_UNIT = 10.0
MIN_REDEMPTION_POINTS = 100


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/rewards/award" and http_method == "POST":
            return _handle_award(event)
        elif resource == "/api/rewards/redeem" and http_method == "POST":
            return _handle_redeem(event)
        elif resource == "/api/rewards/deduct" and http_method == "POST":
            return _handle_deduct(event)
        elif resource == "/api/rewards/balance" and http_method == "GET":
            return _handle_balance(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in reward_engine handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Award Points ─────────────────────────────────────────────────────────


def award_points(user_id: str, transaction_id: str, action_type: str) -> dict[str, Any]:
    """Award points based on action type (borrow, resale_purchase).

    Returns success response with new balance, or error on invalid action.
    """
    points = POINTS_MAP.get(action_type)
    if points is None:
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            f"Invalid action_type: {action_type}. Must be one of {list(POINTS_MAP.keys())}",
        )

    users_table = get_dynamo_table(USERS_TABLE)
    result = users_table.get_item(Key={"user_id": user_id})
    user = result.get("Item")
    if not user:
        return error_response(ErrorCode.NOT_FOUND, "User not found")

    current_balance = int(user.get("reward_points", 0))
    new_balance = current_balance + points

    users_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET reward_points = :bal",
        ExpressionAttributeValues={":bal": new_balance},
    )

    return success_response({
        "user_id": user_id,
        "transaction_id": transaction_id,
        "points_awarded": points,
        "new_balance": new_balance,
    })


def _handle_award(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/rewards/award."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    transaction_id = body.get("transaction_id", "")
    action_type = body.get("action_type", "")
    if not transaction_id or not action_type:
        return error_response(ErrorCode.VALIDATION_ERROR, "transaction_id and action_type are required")

    return award_points(user_id, transaction_id, action_type)


# ── Redeem Points ────────────────────────────────────────────────────────


def redeem_points(user_id: str, points: int) -> dict[str, Any]:
    """Redeem points for a discount.

    Returns {'success': bool, 'new_balance': int, 'discount': float}.
    Minimum redemption is 100 points. 100 points = ₹10 discount.
    """
    if points < MIN_REDEMPTION_POINTS:
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            f"Minimum redemption is {MIN_REDEMPTION_POINTS} points",
        )

    users_table = get_dynamo_table(USERS_TABLE)
    result = users_table.get_item(Key={"user_id": user_id})
    user = result.get("Item")
    if not user:
        return error_response(ErrorCode.NOT_FOUND, "User not found")

    current_balance = int(user.get("reward_points", 0))
    if current_balance < points:
        return error_response(
            ErrorCode.INSUFFICIENT_POINTS,
            f"Insufficient points. Current balance: {current_balance}, requested: {points}",
        )

    new_balance = current_balance - points
    discount = (points / POINTS_PER_DISCOUNT_UNIT) * DISCOUNT_PER_UNIT

    users_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET reward_points = :bal",
        ExpressionAttributeValues={":bal": new_balance},
    )

    return success_response({
        "success": True,
        "new_balance": new_balance,
        "discount": discount,
    })


def _handle_redeem(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/rewards/redeem."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    points = body.get("points")
    if points is None or not isinstance(points, (int, float)) or int(points) < 0:
        return error_response(ErrorCode.VALIDATION_ERROR, "A valid positive 'points' value is required")

    return redeem_points(user_id, int(points))


# ── Deduct Points ────────────────────────────────────────────────────────


def deduct_points(user_id: str, transaction_id: str) -> dict[str, Any]:
    """Deduct points for a cancelled/reversed transaction.

    Looks up the transaction to find reward_points_awarded, deducts from
    user balance. Balance cannot go below 0. Returns new balance.
    """
    txn_table = get_dynamo_table(TRANSACTIONS_TABLE)
    result = txn_table.get_item(Key={"transaction_id": transaction_id})
    txn = result.get("Item")
    if not txn:
        return error_response(ErrorCode.NOT_FOUND, "Transaction not found")

    points_to_deduct = int(txn.get("reward_points_awarded", 0))

    users_table = get_dynamo_table(USERS_TABLE)
    result = users_table.get_item(Key={"user_id": user_id})
    user = result.get("Item")
    if not user:
        return error_response(ErrorCode.NOT_FOUND, "User not found")

    current_balance = int(user.get("reward_points", 0))
    new_balance = max(0, current_balance - points_to_deduct)

    users_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET reward_points = :bal",
        ExpressionAttributeValues={":bal": new_balance},
    )

    return success_response({
        "user_id": user_id,
        "transaction_id": transaction_id,
        "points_deducted": points_to_deduct,
        "new_balance": new_balance,
    })


def _handle_deduct(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/rewards/deduct."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    transaction_id = body.get("transaction_id", "")
    if not transaction_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "transaction_id is required")

    return deduct_points(user_id, transaction_id)


# ── Get Balance ──────────────────────────────────────────────────────────


def get_balance(user_id: str) -> dict[str, Any]:
    """Return the user's current reward point balance."""
    users_table = get_dynamo_table(USERS_TABLE)
    result = users_table.get_item(Key={"user_id": user_id})
    user = result.get("Item")
    if not user:
        return error_response(ErrorCode.NOT_FOUND, "User not found")

    return success_response({
        "user_id": user_id,
        "reward_points": int(user.get("reward_points", 0)),
    })


def _handle_balance(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/rewards/balance."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    return get_balance(user_id)


# ── Helpers ──────────────────────────────────────────────────────────────


def _parse_body(event: dict[str, Any]) -> dict[str, Any] | None:
    """Parse JSON body from API Gateway event."""
    body = event.get("body")
    if not body:
        return None
    if isinstance(body, str):
        try:
            return json.loads(body)
        except (json.JSONDecodeError, TypeError):
            return None
    return body


def _get_user_id(event: dict[str, Any]) -> str | None:
    """Extract user_id from the authorizer context or query params."""
    auth_context = event.get("requestContext", {}).get("authorizer", {})
    user_id = auth_context.get("principalId")
    if user_id and user_id != "user":
        return user_id

    params = event.get("queryStringParameters") or {}
    return params.get("user_id")
