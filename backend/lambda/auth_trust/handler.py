"""Auth/Trust Service Lambda handler.

Endpoints:
- POST /api/auth/callback  — Auth0 callback handler
- GET  /api/users/profile   — Get user profile with trust score
- PUT  /api/users/trust     — Update trust score after transaction
"""

from __future__ import annotations

import json
import os
import logging
from decimal import Decimal
from typing import Any

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

USERS_TABLE = os.environ.get("USERS_TABLE", "")

# Trust score constants
TRUST_SCORE_MIN = 0.0
TRUST_SCORE_MAX = 100.0
TRUST_SCORE_DEFAULT = 50.0
TRUST_SUCCESS_DELTA = 5.0
TRUST_FAILURE_DELTA = -10.0
HIGH_VALUE_THRESHOLD = 50.0


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/auth/callback" and http_method == "POST":
            return _auth_callback(event)
        elif resource == "/api/users/profile" and http_method == "GET":
            return _get_profile(event)
        elif resource == "/api/users/trust" and http_method == "PUT":
            return _update_trust(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in auth_trust handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Auth0 Callback ───────────────────────────────────────────────────────


def _auth_callback(event: dict[str, Any]) -> dict[str, Any]:
    """Handle Auth0 callback — create or update user record."""
    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    user_id = body.get("user_id")
    email = body.get("email")
    if not user_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: user_id")

    table = get_dynamo_table(USERS_TABLE)

    # Check if user already exists
    existing = table.get_item(Key={"user_id": user_id}).get("Item")
    if existing:
        # Update existing user with any new fields
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        update_parts = ["updated_at = :ua"]
        attr_values: dict[str, Any] = {":ua": now}

        display_name = body.get("display_name")
        if display_name:
            update_parts.append("display_name = :dn")
            attr_values[":dn"] = display_name
        address = body.get("address")
        if address:
            update_parts.append("address = :addr")
            attr_values[":addr"] = address
        phone_number = body.get("phone_number")
        if phone_number:
            update_parts.append("phone_number = :ph")
            attr_values[":ph"] = phone_number

        if len(update_parts) > 1:
            table.update_item(
                Key={"user_id": user_id},
                UpdateExpression="SET " + ", ".join(update_parts),
                ExpressionAttributeValues=attr_values,
            )
        return success_response({"user_id": user_id, "message": "User updated"})

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    item: dict[str, Any] = {
        "user_id": user_id,
        "trust_score": Decimal(str(TRUST_SCORE_DEFAULT)),
        "reward_points": 0,
        "created_at": now,
        "updated_at": now,
    }
    if email:
        item["email"] = email
    display_name = body.get("display_name")
    if display_name:
        item["display_name"] = display_name
    address = body.get("address")
    if address:
        item["address"] = address
    phone_number = body.get("phone_number")
    if phone_number:
        item["phone_number"] = phone_number

    table.put_item(Item=item)
    return success_response({"user_id": user_id, "message": "User created"}, status_code=201)


# ── Get Profile ──────────────────────────────────────────────────────────


def get_profile(user_id: str) -> dict[str, Any]:
    """Return user profile with trust score and reward balance.

    Args:
        user_id: The user's identifier.

    Returns:
        Dict with user profile data, or error response if not found.
    """
    table = get_dynamo_table(USERS_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    item = result.get("Item")
    if not item:
        return error_response(ErrorCode.NOT_FOUND, "User not found")

    return success_response({
        "user_id": item["user_id"],
        "display_name": item.get("display_name", ""),
        "email": item.get("email", ""),
        "address": item.get("address", ""),
        "phone_number": item.get("phone_number", ""),
        "trust_score": float(item.get("trust_score", TRUST_SCORE_DEFAULT)),
        "reward_points": int(item.get("reward_points", 0)),
        "created_at": item.get("created_at", ""),
        "updated_at": item.get("updated_at", ""),
    })


def _get_profile(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/users/profile."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")
    return get_profile(user_id)


# ── Trust Score Update ───────────────────────────────────────────────────


def update_trust_score(user_id: str, transaction_outcome: str) -> float:
    """Update trust score based on transaction outcome.

    Adjusts the score by +5.0 for 'success' and -10.0 for 'failure',
    clamping the result to the 0.0–100.0 range.

    Args:
        user_id: The user's identifier.
        transaction_outcome: Either ``"success"`` or ``"failure"``.

    Returns:
        The new trust score after adjustment.

    Raises:
        ValueError: If *transaction_outcome* is not ``"success"`` or ``"failure"``.
    """
    if transaction_outcome not in ("success", "failure"):
        raise ValueError(f"Invalid transaction_outcome: {transaction_outcome}")

    delta = TRUST_SUCCESS_DELTA if transaction_outcome == "success" else TRUST_FAILURE_DELTA

    table = get_dynamo_table(USERS_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    item = result.get("Item")
    current_score = float(item["trust_score"]) if item else TRUST_SCORE_DEFAULT

    new_score = max(TRUST_SCORE_MIN, min(TRUST_SCORE_MAX, current_score + delta))

    from datetime import datetime, timezone

    table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET trust_score = :ts, updated_at = :ua",
        ExpressionAttributeValues={
            ":ts": str(new_score),
            ":ua": datetime.now(timezone.utc).isoformat(),
        },
    )
    return new_score


def _update_trust(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for PUT /api/users/trust."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    outcome = body.get("transaction_outcome")
    if outcome not in ("success", "failure"):
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            "transaction_outcome must be 'success' or 'failure'",
        )

    new_score = update_trust_score(user_id, outcome)
    return success_response({"user_id": user_id, "trust_score": new_score})


# ── Trust-Based Access Control ───────────────────────────────────────────


def check_trust_access(user_id: str, item_value: str) -> bool:
    """Check if user's trust score allows access to item value tier.

    High-value items require a trust score >= HIGH_VALUE_THRESHOLD (50.0).

    Args:
        user_id: The user's identifier.
        item_value: ``"high"`` or ``"standard"``.

    Returns:
        ``True`` if the user may access the item tier, ``False`` otherwise.
    """
    if item_value != "high":
        return True

    table = get_dynamo_table(USERS_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    item = result.get("Item")
    score = float(item["trust_score"]) if item else TRUST_SCORE_DEFAULT
    return score >= HIGH_VALUE_THRESHOLD


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
    # From custom authorizer context
    auth_context = event.get("requestContext", {}).get("authorizer", {})
    user_id = auth_context.get("principalId")
    if user_id and user_id != "user":
        return user_id

    # Fallback: query string parameter (for testing / simple setups)
    params = event.get("queryStringParameters") or {}
    return params.get("user_id")
