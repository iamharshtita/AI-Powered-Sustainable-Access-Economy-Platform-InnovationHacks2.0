"""Unit tests for the Listing Management Service handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from listing_management.handler import (
    handler,
    create_listing,
    update_listing,
    deactivate_listing,
    get_listing,
    REQUIRED_FIELDS,
)


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    body: dict | None = None,
    user_id: str | None = None,
    path_params: dict | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    event: dict = {
        "httpMethod": method,
        "resource": resource,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": {"user_id": user_id} if user_id else None,
        "pathParameters": path_params,
        "requestContext": {"authorizer": {}},
    }
    return event


def _valid_listing_data() -> dict:
    """Return a valid listing payload."""
    return {
        "category": "electronics",
        "condition": "good",
        "pricing": {"borrow_price_per_day": 5.0, "resale_price": 50.0},
        "description": "A nice gadget",
        "title": "Gadget X",
        "location": "NYC",
    }


def _mock_table(items: dict | None = None):
    """Return a mock DynamoDB table with optional pre-loaded items keyed by item_id."""
    table = MagicMock()
    store = dict(items) if items else {}

    def get_item(Key):
        iid = Key.get("item_id")
        item = store.get(iid)
        return {"Item": item} if item else {}

    def put_item(Item):
        store[Item["item_id"]] = Item

    def update_item(Key, UpdateExpression, ExpressionAttributeValues, **kwargs):
        iid = Key["item_id"]
        if iid not in store:
            return
        # Simple simulation: parse SET expressions
        for attr_key, attr_val in ExpressionAttributeValues.items():
            # Map :field -> field in store
            field_name = attr_key.lstrip(":")
            if field_name == "s":
                field_name = "status"
            store[iid][field_name] = attr_val

    table.get_item = MagicMock(side_effect=get_item)
    table.put_item = MagicMock(side_effect=put_item)
    table.update_item = MagicMock(side_effect=update_item)
    return table, store


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("listing_management.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("listing_management.handler.get_dynamo_table")
    def test_create_listing_route(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        event = _api_event("POST", "/api/listings", body=_valid_listing_data(), user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 201

    @patch("listing_management.handler.get_dynamo_table")
    def test_get_listing_route(self, mock_get_table):
        table, _ = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
            "pricing": {"borrow_price_per_day": 5, "resale_price": 50},
            "description": "test", "title": "Test",
        }})
        mock_get_table.return_value = table
        event = _api_event("GET", "/api/listings/{item_id}", path_params={"item_id": "item-1"})
        resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── Create Listing Tests ─────────────────────────────────────────────────


class TestCreateListing:
    @patch("listing_management.handler.get_dynamo_table")
    def test_creates_listing_with_all_fields(self, mock_get_table):
        table, store = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["owner_id"] == "u1"
        assert body["category"] == "electronics"
        assert body["condition"] == "good"
        assert body["status"] == "active"
        assert body["pricing"]["borrow_price_per_day"] == 5.0
        assert "item_id" in body
        assert "created_at" in body
        assert "updated_at" in body

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_category_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        del data["category"]
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400
        assert "category" in json.loads(resp["body"])["message"]

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_condition_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        del data["condition"]
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_pricing_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        del data["pricing"]
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_description_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        del data["description"]
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_invalid_pricing_structure_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        data["pricing"] = {"borrow_price_per_day": 5.0}  # missing resale_price
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_pricing_not_dict_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        data = _valid_listing_data()
        data["pricing"] = "not a dict"
        resp = create_listing("u1", data)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_user_id_returns_401(self, mock_get_table):
        event = _api_event("POST", "/api/listings", body=_valid_listing_data())
        resp = handler(event, None)
        assert resp["statusCode"] == 401

    @patch("listing_management.handler.get_dynamo_table")
    def test_missing_body_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/listings", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Update Listing Tests ─────────────────────────────────────────────────


class TestUpdateListing:
    @patch("listing_management.handler.get_dynamo_table")
    def test_updates_listing_fields(self, mock_get_table):
        table, store = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active", "title": "Old Title",
            "description": "old", "pricing": {"borrow_price_per_day": 5, "resale_price": 50},
            "location": "", "created_at": "2024-01-01T00:00:00+00:00",
            "updated_at": "2024-01-01T00:00:00+00:00",
        }})
        mock_get_table.return_value = table
        resp = update_listing("u1", "item-1", {"title": "New Title"})
        assert resp["statusCode"] == 200

    @patch("listing_management.handler.get_dynamo_table")
    def test_update_nonexistent_returns_404(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = update_listing("u1", "nonexistent", {"title": "X"})
        assert resp["statusCode"] == 404

    @patch("listing_management.handler.get_dynamo_table")
    def test_update_by_non_owner_returns_403(self, mock_get_table):
        table, _ = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
        }})
        mock_get_table.return_value = table
        resp = update_listing("u2", "item-1", {"title": "Hacked"})
        assert resp["statusCode"] == 403

    @patch("listing_management.handler.get_dynamo_table")
    def test_update_no_valid_fields_returns_400(self, mock_get_table):
        table, _ = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
        }})
        mock_get_table.return_value = table
        resp = update_listing("u1", "item-1", {"status": "borrowed"})  # status not allowed
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_update_route_missing_item_id_returns_400(self, mock_get_table):
        event = _api_event("PUT", "/api/listings/{item_id}", body={"title": "X"}, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("listing_management.handler.get_dynamo_table")
    def test_update_route_missing_body_returns_400(self, mock_get_table):
        event = _api_event("PUT", "/api/listings/{item_id}", user_id="u1", path_params={"item_id": "item-1"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Deactivate Listing Tests ─────────────────────────────────────────────


class TestDeactivateListing:
    @patch("listing_management.handler.get_dynamo_table")
    def test_deactivates_listing(self, mock_get_table):
        table, store = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
        }})
        mock_get_table.return_value = table
        resp = deactivate_listing("u1", "item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["status"] == "inactive"

    @patch("listing_management.handler.get_dynamo_table")
    def test_deactivate_nonexistent_returns_404(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = deactivate_listing("u1", "nonexistent")
        assert resp["statusCode"] == 404

    @patch("listing_management.handler.get_dynamo_table")
    def test_deactivate_by_non_owner_returns_403(self, mock_get_table):
        table, _ = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
        }})
        mock_get_table.return_value = table
        resp = deactivate_listing("u2", "item-1")
        assert resp["statusCode"] == 403

    @patch("listing_management.handler.get_dynamo_table")
    def test_deactivate_route_missing_user_returns_401(self, mock_get_table):
        event = _api_event("DELETE", "/api/listings/{item_id}", path_params={"item_id": "item-1"})
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── Get Listing Tests ────────────────────────────────────────────────────


class TestGetListing:
    @patch("listing_management.handler.get_dynamo_table")
    def test_returns_listing(self, mock_get_table):
        table, _ = _mock_table({"item-1": {
            "item_id": "item-1", "owner_id": "u1", "category": "electronics",
            "condition": "good", "status": "active",
            "pricing": {"borrow_price_per_day": 5, "resale_price": 50},
            "description": "test", "title": "Test",
        }})
        mock_get_table.return_value = table
        resp = get_listing("item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["item_id"] == "item-1"
        assert body["category"] == "electronics"

    @patch("listing_management.handler.get_dynamo_table")
    def test_listing_not_found(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = get_listing("nonexistent")
        assert resp["statusCode"] == 404

    @patch("listing_management.handler.get_dynamo_table")
    def test_get_route_missing_item_id_returns_400(self, mock_get_table):
        event = _api_event("GET", "/api/listings/{item_id}")
        resp = handler(event, None)
        assert resp["statusCode"] == 400
