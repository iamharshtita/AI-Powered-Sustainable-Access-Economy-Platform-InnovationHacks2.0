"""Structured JSON response helpers for Lambda handlers.

All Lambda functions return a consistent response envelope:
  {
    "statusCode": <int>,
    "body": { ... }
  }

Error responses include an error code, human-readable message, and a
request ID for traceability.
"""

from __future__ import annotations

import json
import uuid
from enum import Enum
from typing import Any


class ErrorCode(str, Enum):
    """Canonical error codes mapped to HTTP status codes."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    INSUFFICIENT_POINTS = "INSUFFICIENT_POINTS"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Maps each ErrorCode to its default HTTP status code.
_STATUS_MAP: dict[ErrorCode, int] = {
    ErrorCode.VALIDATION_ERROR: 400,
    ErrorCode.UNAUTHORIZED: 401,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.INSUFFICIENT_POINTS: 400,
    ErrorCode.SERVICE_UNAVAILABLE: 503,
    ErrorCode.INTERNAL_ERROR: 500,
}


def success_response(body: Any, status_code: int = 200) -> dict[str, Any]:
    """Build a successful API Gateway response.

    Args:
        body: Serialisable payload returned to the caller.
        status_code: HTTP status (default 200).

    Returns:
        Dict with ``statusCode`` and JSON-encoded ``body``.
    """
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
    }


def error_response(
    error_code: ErrorCode,
    message: str,
    request_id: str | None = None,
) -> dict[str, Any]:
    """Build a structured error response.

    Args:
        error_code: One of the canonical :class:`ErrorCode` values.
        message: Human-readable description of the error.
        request_id: Optional correlation ID.  A UUID is generated when
            omitted.

    Returns:
        Dict matching the design error envelope::

            {
                "statusCode": 400,
                "body": "{\"error\": \"VALIDATION_ERROR\", ...}"
            }
    """
    status_code = _STATUS_MAP.get(error_code, 500)
    body = {
        "error": error_code.value,
        "message": message,
        "requestId": request_id or str(uuid.uuid4()),
    }
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
    }
