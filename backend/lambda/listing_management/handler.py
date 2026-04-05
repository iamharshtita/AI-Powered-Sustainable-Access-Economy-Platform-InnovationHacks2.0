"""Listing Management Service Lambda handler.

Endpoints:
- POST   /api/listings             — Create a new listing
- PUT    /api/listings/{item_id}   — Update a listing
- DELETE /api/listings/{item_id}   — Deactivate a listing
- GET    /api/listings/{item_id}   — Get listing detail
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

ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")

REQUIRED_FIELDS = ("category", "condition", "pricing", "description")
VALID_STATUSES = ("active", "inactive", "borrowed")
VALID_CONDITIONS = ("new", "like_new", "good", "fair")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/listings" and http_method == "POST":
            return _create_listing(event)
        elif resource == "/api/listings/{item_id}" and http_method == "PUT":
            return _update_listing(event)
        elif resource == "/api/listings/{item_id}" and http_method == "DELETE":
            return _deactivate_listing(event)
        elif resource == "/api/listings/{item_id}" and http_method == "GET":
            return _get_listing(event)
        elif resource == "/api/listings/{item_id}/upload-url" and http_method == "GET":
            return _get_upload_url(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in listing_management handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Create Listing ───────────────────────────────────────────────────────


def create_listing(user_id: str, listing_data: dict[str, Any]) -> dict[str, Any]:
    """Validate required fields and create a new listing.

    Args:
        user_id: Owner of the listing.
        listing_data: Dict with category, condition, pricing, description, etc.

    Returns:
        Success response with the created listing, or validation error.
    """
    # Validate required fields
    missing = [f for f in REQUIRED_FIELDS if not listing_data.get(f)]
    if missing:
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            f"Missing required fields: {', '.join(missing)}",
        )

    # Validate pricing structure
    pricing = listing_data["pricing"]
    if not isinstance(pricing, dict):
        return error_response(ErrorCode.VALIDATION_ERROR, "pricing must be a dict")
    if "borrow_price_per_day" not in pricing or "resale_price" not in pricing:
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            "pricing must include borrow_price_per_day and resale_price",
        )

    now = datetime.now(timezone.utc).isoformat()
    item_id = str(uuid.uuid4())

    item: dict[str, Any] = {
        "item_id": item_id,
        "owner_id": user_id,
        "category": listing_data["category"],
        "condition": listing_data["condition"],
        "title": listing_data.get("title", ""),
        "description": listing_data["description"],
        "pricing": pricing,
        "location": listing_data.get("location", ""),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    # Store coordinates if provided
    if listing_data.get("latitude") is not None:
        item["latitude"] = float(listing_data["latitude"])
    if listing_data.get("longitude") is not None:
        item["longitude"] = float(listing_data["longitude"])

    table = get_dynamo_table(ITEMS_TABLE)
    table.put_item(Item=item)

    return success_response(item, status_code=201)


def _create_listing(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/listings."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    return create_listing(user_id, body)


# ── Update Listing ───────────────────────────────────────────────────────


def update_listing(user_id: str, item_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Update listing fields. Returns updated listing.

    Args:
        user_id: The requesting user (must be the owner).
        item_id: The listing to update.
        updates: Dict of fields to update.

    Returns:
        Success response with the updated listing, or error.
    """
    table = get_dynamo_table(ITEMS_TABLE)
    result = table.get_item(Key={"item_id": item_id})
    item = result.get("Item")
    if not item:
        return error_response(ErrorCode.NOT_FOUND, "Listing not found")

    if item.get("owner_id") != user_id:
        return error_response(ErrorCode.FORBIDDEN, "You can only update your own listings")

    # Only allow updating safe fields
    allowed_fields = {"category", "condition", "title", "description", "pricing", "location", "latitude", "longitude"}
    now = datetime.now(timezone.utc).isoformat()

    update_expressions = []
    attr_values: dict[str, Any] = {}
    for key, value in updates.items():
        if key in allowed_fields:
            update_expressions.append(f"{key} = :{key}")
            attr_values[f":{key}"] = value

    if not update_expressions:
        return error_response(ErrorCode.VALIDATION_ERROR, "No valid fields to update")

    update_expressions.append("updated_at = :updated_at")
    attr_values[":updated_at"] = now

    table.update_item(
        Key={"item_id": item_id},
        UpdateExpression="SET " + ", ".join(update_expressions),
        ExpressionAttributeValues=attr_values,
    )

    # Return the updated item
    updated = table.get_item(Key={"item_id": item_id}).get("Item", {})
    return success_response(updated)


def _update_listing(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for PUT /api/listings/{item_id}."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    item_id = (event.get("pathParameters") or {}).get("item_id")
    if not item_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing item_id in path")

    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    return update_listing(user_id, item_id, body)


# ── Deactivate Listing ───────────────────────────────────────────────────


def deactivate_listing(user_id: str, item_id: str) -> dict[str, Any]:
    """Mark listing as inactive.

    Args:
        user_id: The requesting user (must be the owner).
        item_id: The listing to deactivate.

    Returns:
        Success response or error.
    """
    table = get_dynamo_table(ITEMS_TABLE)
    result = table.get_item(Key={"item_id": item_id})
    item = result.get("Item")
    if not item:
        return error_response(ErrorCode.NOT_FOUND, "Listing not found")

    if item.get("owner_id") != user_id:
        return error_response(ErrorCode.FORBIDDEN, "You can only deactivate your own listings")

    now = datetime.now(timezone.utc).isoformat()
    table.update_item(
        Key={"item_id": item_id},
        UpdateExpression="SET #s = :status, updated_at = :updated_at",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":status": "inactive",
            ":updated_at": now,
        },
    )

    return success_response({"item_id": item_id, "status": "inactive"})


def _deactivate_listing(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for DELETE /api/listings/{item_id}."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    item_id = (event.get("pathParameters") or {}).get("item_id")
    if not item_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing item_id in path")

    return deactivate_listing(user_id, item_id)


# ── Get Listing ──────────────────────────────────────────────────────────


def get_listing(item_id: str) -> dict[str, Any]:
    """Return listing detail.

    Args:
        item_id: The listing identifier.

    Returns:
        Success response with listing data, or 404 error.
    """
    table = get_dynamo_table(ITEMS_TABLE)
    result = table.get_item(Key={"item_id": item_id})
    item = result.get("Item")
    if not item:
        return error_response(ErrorCode.NOT_FOUND, "Listing not found")

    return success_response(item)


def _get_listing(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/listings/{item_id}."""
    item_id = (event.get("pathParameters") or {}).get("item_id")
    if not item_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing item_id in path")

    return get_listing(item_id)


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


# ── Presigned Upload URL ─────────────────────────────────────────────────


def get_upload_url(user_id: str, item_id: str, filename: str) -> dict[str, Any]:
    """Generate a presigned S3 URL for uploading a listing image.

    Args:
        user_id: The authenticated user (must own the listing).
        item_id: The listing to attach the image to.
        filename: The image filename (e.g. photo.jpg).

    Returns:
        Success response with upload_url and image_url.
    """
    import boto3
    import os

    bucket = os.environ.get("LISTING_IMAGES_BUCKET", "")
    if not bucket:
        return error_response(ErrorCode.SERVICE_UNAVAILABLE, "Image upload not configured")

    # Verify ownership
    table = get_dynamo_table(ITEMS_TABLE)
    result = table.get_item(Key={"item_id": item_id})
    item = result.get("Item")
    if not item:
        return error_response(ErrorCode.NOT_FOUND, "Listing not found")
    if item.get("owner_id") != user_id:
        return error_response(ErrorCode.FORBIDDEN, "You can only upload images for your own listings")

    s3_key = f"items/{item_id}/{filename}"
    s3 = boto3.client("s3")
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": s3_key, "ContentType": "image/*"},
        ExpiresIn=300,  # 5 minutes
    )

    image_url = f"https://{bucket}.s3.us-east-1.amazonaws.com/{s3_key}"

    # Update the item's image_url in DynamoDB
    table.update_item(
        Key={"item_id": item_id},
        UpdateExpression="SET image_url = :url, updated_at = :ua",
        ExpressionAttributeValues={
            ":url": image_url,
            ":ua": datetime.now(timezone.utc).isoformat(),
        },
    )

    return success_response({"upload_url": upload_url, "image_url": image_url})


def _get_upload_url(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/listings/{item_id}/upload-url."""
    user_id = _get_user_id(event)
    if not user_id:
        return error_response(ErrorCode.UNAUTHORIZED, "Missing user identity")

    item_id = (event.get("pathParameters") or {}).get("item_id")
    if not item_id:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing item_id in path")

    params = event.get("queryStringParameters") or {}
    filename = params.get("filename", "image.jpg")

    return get_upload_url(user_id, item_id, filename)
