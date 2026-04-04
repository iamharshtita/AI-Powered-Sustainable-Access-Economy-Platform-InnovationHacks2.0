"""Search Service Lambda handler.

Endpoints:
- GET  /api/search        — Text search against Items table
- POST /api/search/voice  — Voice search (transcribe audio, then text search)
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

import urllib.request
import urllib.error

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")
VOICE_SERVICE_URL = os.environ.get("VOICE_SERVICE_URL", "")

# Fields every search result must include
RESULT_FIELDS = ("item_id", "category", "condition", "pricing", "status", "title", "description")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/search" and http_method == "GET":
            return _handle_text_search(event)
        elif resource == "/api/search/voice" and http_method == "POST":
            return _handle_voice_search(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in search handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Text Search ──────────────────────────────────────────────────────────


def search_items(query: str, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Search items by text query with optional filters.

    Scans the Items table for active listings whose title or description
    contains the query string (case-insensitive).

    Args:
        query: Text search string.
        filters: Optional dict with keys like 'category', 'condition'.

    Returns:
        List of matching item dicts with required result fields.
    """
    table = get_dynamo_table(ITEMS_TABLE)

    # Build filter expression: status must be active
    filter_parts = ["#s = :active"]
    attr_names: dict[str, str] = {"#s": "status"}
    attr_values: dict[str, Any] = {":active": "active"}

    # Text match on title or description (case-insensitive via contains)
    if query:
        filter_parts.append("(contains(#title_lower, :query) OR contains(#desc_lower, :query))")
        attr_names["#title_lower"] = "title"
        attr_names["#desc_lower"] = "description"
        attr_values[":query"] = query.lower()

    # Optional category filter
    if filters and filters.get("category"):
        filter_parts.append("#cat = :cat")
        attr_names["#cat"] = "category"
        attr_values[":cat"] = filters["category"]

    # Optional condition filter
    if filters and filters.get("condition"):
        filter_parts.append("#cond = :cond")
        attr_names["#cond"] = "condition"
        attr_values[":cond"] = filters["condition"]

    scan_kwargs: dict[str, Any] = {
        "FilterExpression": " AND ".join(filter_parts),
        "ExpressionAttributeNames": attr_names,
        "ExpressionAttributeValues": attr_values,
    }

    results: list[dict[str, Any]] = []
    while True:
        response = table.scan(**scan_kwargs)
        for item in response.get("Items", []):
            # Case-insensitive match: DynamoDB contains is case-sensitive,
            # so we do a Python-level check as well.
            if query and not _matches_query(item, query):
                continue
            results.append(_project_result(item))

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    return results


def _matches_query(item: dict[str, Any], query: str) -> bool:
    """Return True if query appears in title or description (case-insensitive)."""
    q = query.lower()
    title = str(item.get("title", "")).lower()
    description = str(item.get("description", "")).lower()
    return q in title or q in description


def _project_result(item: dict[str, Any]) -> dict[str, Any]:
    """Project an item to only the required result fields."""
    return {field: item.get(field) for field in RESULT_FIELDS}


def _handle_text_search(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/search."""
    params = event.get("queryStringParameters") or {}
    query = params.get("q", "").strip()

    if not query:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required query parameter: q")

    filters: dict[str, Any] = {}
    if params.get("category"):
        filters["category"] = params["category"]
    if params.get("condition"):
        filters["condition"] = params["condition"]

    results = search_items(query, filters if filters else None)
    return success_response({"results": results, "count": len(results)})


# ── Voice Search ─────────────────────────────────────────────────────────


def voice_search(audio_data: bytes) -> list[dict[str, Any]]:
    """Transcribe audio via Voice Service, then delegate to search_items.

    Args:
        audio_data: Raw audio bytes.

    Returns:
        List of matching item dicts, same as search_items.

    Raises:
        RuntimeError: If transcription fails or Voice Service is unavailable.
    """
    transcribed_text = _transcribe_audio(audio_data)
    if not transcribed_text:
        raise RuntimeError("Voice transcription returned empty text")
    return search_items(transcribed_text)


def _transcribe_audio(audio_data: bytes) -> str | None:
    """Call the Voice Service Lambda for transcription.

    Returns the transcribed text, or None on failure.
    """
    if not VOICE_SERVICE_URL:
        return None

    payload = json.dumps({"audio": base64.b64encode(audio_data).decode("utf-8")}).encode()
    req = urllib.request.Request(
        f"{VOICE_SERVICE_URL}/api/voice/transcribe",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            return body.get("text", "")
    except (urllib.error.URLError, urllib.error.HTTPError, Exception):
        logger.exception("Voice Service transcription failed")
        return None


def _handle_voice_search(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/search/voice."""
    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    audio_b64 = body.get("audio")
    if not audio_b64:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: audio")

    try:
        audio_data = base64.b64decode(audio_b64)
    except Exception:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid base64 audio data")

    try:
        results = voice_search(audio_data)
    except RuntimeError:
        return error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Voice transcription failed. Please try text search instead.",
        )

    return success_response({"results": results, "count": len(results)})


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
