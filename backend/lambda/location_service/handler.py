"""Location Service Lambda handler.

Endpoints:
- GET  /api/listings/nearby  — Find listings near a location
- POST /api/geocode          — Geocode an address to lat/lng
"""

from __future__ import annotations

import json
import logging
import math
import os
from typing import Any

import boto3

from shared.response import success_response, error_response, ErrorCode
from shared.dynamo import get_dynamo_table

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

ITEMS_TABLE = os.environ.get("ITEMS_TABLE", "")
PLACE_INDEX_NAME = os.environ.get("PLACE_INDEX_NAME", "")

# Earth radius in km
EARTH_RADIUS_KM = 6371.0
DEFAULT_RADIUS_KM = 10.0
MAX_RADIUS_KM = 50.0

# Arizona bounding box (lat/lng limits)
AZ_LAT_MIN = 31.33
AZ_LAT_MAX = 37.00
AZ_LNG_MIN = -114.82
AZ_LNG_MAX = -109.04


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/listings/nearby" and http_method == "GET":
            return _handle_nearby(event)
        elif resource == "/api/geocode" and http_method == "POST":
            return _handle_geocode(event)
        else:
            return error_response(ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}")
    except Exception:
        logger.exception("Unhandled error in location_service handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Nearby Listings ──────────────────────────────────────────────────────


def find_nearby_listings(
    lat: float, lng: float, radius_km: float = DEFAULT_RADIUS_KM
) -> list[dict[str, Any]]:
    """Find active listings within a radius of the given coordinates.

    Uses Haversine formula for distance calculation.

    Args:
        lat: User's latitude.
        lng: User's longitude.
        radius_km: Search radius in kilometers (default 10, max 50).

    Returns:
        List of listings with distance_km field, sorted by distance.
    """
    radius_km = min(radius_km, MAX_RADIUS_KM)
    table = get_dynamo_table(ITEMS_TABLE)

    # Scan for active items that have coordinates
    results: list[dict[str, Any]] = []
    scan_kwargs: dict[str, Any] = {
        "FilterExpression": "#s = :active",
        "ExpressionAttributeNames": {"#s": "status"},
        "ExpressionAttributeValues": {":active": "active"},
    }

    while True:
        response = table.scan(**scan_kwargs)
        for item in response.get("Items", []):
            item_lat = item.get("latitude")
            item_lng = item.get("longitude")
            if item_lat is None or item_lng is None:
                continue

            distance = haversine(lat, lng, float(item_lat), float(item_lng))
            if distance <= radius_km:
                result = {
                    "item_id": item.get("item_id"),
                    "title": item.get("title", ""),
                    "category": item.get("category", ""),
                    "condition": item.get("condition", ""),
                    "pricing": item.get("pricing", {}),
                    "status": item.get("status", ""),
                    "description": item.get("description", ""),
                    "location": item.get("location", ""),
                    "latitude": float(item_lat),
                    "longitude": float(item_lng),
                    "distance_km": round(distance, 2),
                }
                results.append(result)

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    results.sort(key=lambda x: x["distance_km"])
    return results


def _handle_nearby(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for GET /api/listings/nearby."""
    params = event.get("queryStringParameters") or {}

    lat_str = params.get("lat")
    lng_str = params.get("lng")
    if not lat_str or not lng_str:
        return error_response(
            ErrorCode.VALIDATION_ERROR, "Missing required query parameters: lat, lng"
        )

    try:
        lat = float(lat_str)
        lng = float(lng_str)
    except ValueError:
        return error_response(ErrorCode.VALIDATION_ERROR, "lat and lng must be valid numbers")

    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return error_response(ErrorCode.VALIDATION_ERROR, "lat must be -90..90, lng must be -180..180")

    # Restrict to Arizona
    if not (AZ_LAT_MIN <= lat <= AZ_LAT_MAX) or not (AZ_LNG_MIN <= lng <= AZ_LNG_MAX):
        return error_response(
            ErrorCode.VALIDATION_ERROR,
            "Location must be within Arizona, US"
        )

    radius_km = DEFAULT_RADIUS_KM
    if params.get("radius"):
        try:
            radius_km = float(params["radius"])
        except ValueError:
            pass

    results = find_nearby_listings(lat, lng, radius_km)
    return success_response({"results": results, "count": len(results), "radius_km": min(radius_km, MAX_RADIUS_KM)})


# ── Geocoding ────────────────────────────────────────────────────────────


def geocode_address(address: str) -> dict[str, Any] | None:
    """Geocode an address using Amazon Location Service.

    Args:
        address: Text address to geocode.

    Returns:
        Dict with lat, lng, and label, or None if not found.
    """
    if not PLACE_INDEX_NAME:
        logger.error("PLACE_INDEX_NAME not configured")
        return None

    try:
        client = boto3.client("location")
        response = client.search_place_index_for_text(
            IndexName=PLACE_INDEX_NAME,
            Text=address,
            MaxResults=1,
            FilterBBox=[AZ_LNG_MIN, AZ_LAT_MIN, AZ_LNG_MAX, AZ_LAT_MAX],
            FilterCountries=["USA"],
        )
        results = response.get("Results", [])
        if not results:
            return None

        place = results[0].get("Place", {})
        geometry = place.get("Geometry", {}).get("Point", [])
        if len(geometry) < 2:
            return None

        return {
            "longitude": geometry[0],
            "latitude": geometry[1],
            "label": place.get("Label", address),
        }
    except Exception:
        logger.exception("Geocoding failed for address: %s", address)
        return None


def _handle_geocode(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/geocode."""
    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    address = body.get("address", "").strip()
    if not address:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: address")

    result = geocode_address(address)
    if not result:
        return error_response(ErrorCode.NOT_FOUND, f"Could not geocode address: {address}")

    return success_response(result)


# ── Haversine ────────────────────────────────────────────────────────────


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points using the Haversine formula.

    Args:
        lat1, lng1: First point coordinates in degrees.
        lat2, lng2: Second point coordinates in degrees.

    Returns:
        Distance in kilometers.
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


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
