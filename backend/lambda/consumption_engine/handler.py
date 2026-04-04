"""Consumption Engine Lambda handler.

Endpoints:
- POST /api/events                  — Record a user action event
- GET  /api/consumption/profile     — Get user's consumption profile
- GET  /api/consumption/mirror      — Get dashboard data (patterns, savings, CO2)
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EVENTS_TABLE = os.environ.get("EVENTS_TABLE", "")
CONSUMPTION_PROFILES_TABLE = os.environ.get("CONSUMPTION_PROFILES_TABLE", "")
TRANSACTIONS_TABLE = os.environ.get("TRANSACTIONS_TABLE", "")

VALID_EVENT_TYPES = ("search", "view", "borrow", "buy")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/events" and http_method == "POST":
            return _track_event(event)
        elif resource == "/api/consumption/profile" and http_method == "GET":
            return _get_consumption_profile(event)
        elif resource == "/api/consumption/mirror" and http_method == "GET":
            return _get_mirror_data(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in consumption_engine handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Track Event ──────────────────────────────────────────────────────────


def track_event(
    user_id: str,
    event_type: str,
    item_id: str | None,
    metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    """Record a user action event in the Events table.

    Args:
        user_id: The user performing the action.
        event_type: One of search, view, borrow, buy.
        item_id: Related item (nullable for search events).
        metadata: Additional context (search query, etc.).

    Returns:
        Success response with the created event, or validation error.
    """
    if event_type not in VALID_EVENT_TYPES:
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            f"Invalid event_type: {event_type}. Must be one of {VALID_EVENT_TYPES}",
        )

    now = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid.uuid4())

    item: dict[str, Any] = {
        "event_id": event_id,
        "user_id": user_id,
        "event_type": event_type,
        "item_id": item_id or "",
        "metadata": metadata or {},
        "timestamp": now,
    }

    table = get_dynamo_table(EVENTS_TABLE)
    table.put_item(Item=item)

    return success_response(item, status_code=201)


def _track_event(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/events."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    event_type = body.get("event_type", "")
    item_id = body.get("item_id")
    metadata = body.get("metadata")

    return track_event(user_id, event_type, item_id, metadata)


# ── Get Consumption Profile ──────────────────────────────────────────────


def get_consumption_profile(user_id: str) -> dict[str, Any]:
    """Return the user's consumption profile from the Consumption Profiles table.

    Args:
        user_id: The user identifier.

    Returns:
        Success response with profile data, or 404 if not found.
    """
    table = get_dynamo_table(CONSUMPTION_PROFILES_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    profile = result.get("Item")
    if not profile:
        return error_response(ErrorCode.NOT_FOUND, "Consumption profile not found")

    return success_response(profile)


def _get_consumption_profile(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/consumption/profile."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    return get_consumption_profile(user_id)


# ── Get Mirror Data ──────────────────────────────────────────────────────


def get_mirror_data(user_id: str) -> dict[str, Any]:
    """Return dashboard data aggregated from the Consumption Profiles table.

    Provides total borrows, purchases, CO2 saved, and money saved.

    Args:
        user_id: The user identifier.

    Returns:
        Success response with aggregated dashboard data.
    """
    table = get_dynamo_table(CONSUMPTION_PROFILES_TABLE)
    result = table.get_item(Key={"user_id": user_id})
    profile = result.get("Item")

    if not profile:
        # Return zeroed dashboard for users without a profile yet
        return success_response({
            "user_id": user_id,
            "total_borrows": 0,
            "total_purchases": 0,
            "total_co2_saved_kg": 0,
            "total_money_saved": 0,
        })

    return success_response({
        "user_id": user_id,
        "total_borrows": profile.get("total_borrows", 0),
        "total_purchases": profile.get("total_purchases", 0),
        "total_co2_saved_kg": profile.get("total_co2_saved_kg", 0),
        "total_money_saved": profile.get("total_money_saved", 0),
    })


def _get_mirror_data(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/consumption/mirror."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    return get_mirror_data(user_id)


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
