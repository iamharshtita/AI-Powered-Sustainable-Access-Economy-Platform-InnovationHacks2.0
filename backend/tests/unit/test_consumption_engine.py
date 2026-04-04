"""Unit tests for the Consumption Engine handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from consumption_engine.handler import (
    handler,
    track_event,
    get_consumption_profile,
    get_mirror_data,
    VALID_EVENT_TYPES,
)


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    body: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    event: dict = {
        "httpMethod": method,
        "resource": resource,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": {"user_id": user_id} if user_id else None,
        "requestContext": {"authorizer": {}},
    }
    return event


def _mock_table(items: dict | None = None):
    """Return a mock DynamoDB table with optional pre-loaded items keyed by PK."""
    table = MagicMock()
    store = dict(items) if items else {}

    def get_item(Key):
        pk = list(Key.values())[0]
        item = store.get(pk)
        return {"Item": item} if item else {}

    def put_item(Item):
        pk_field = "event_id" if "event_id" in Item else "user_id"
        store[Item[pk_field]] = Item

    table.get_item = MagicMock(side_effect=get_item)
    table.put_item = MagicMock(side_effect=put_item)
    return table, store


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("consumption_engine.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_track_event_route(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        body = {"event_type": "view", "item_id": "item-1"}
        event = _api_event("POST", "/api/events", body=body, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 201

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_get_profile_route(self, mock_get_table):
        table, _ = _mock_table({"u1": {
            "user_id": "u1", "total_borrows": 5, "total_purchases": 2,
            "total_co2_saved_kg": 10.5, "total_money_saved": 200,
            "category_borrow_counts": {"electronics": 3},
        }})
        mock_get_table.return_value = table
        event = _api_event("GET", "/api/consumption/profile", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_get_mirror_route(self, mock_get_table):
        table, _ = _mock_table({"u1": {
            "user_id": "u1", "total_borrows": 3, "total_purchases": 1,
            "total_co2_saved_kg": 7.0, "total_money_saved": 100,
        }})
        mock_get_table.return_value = table
        event = _api_event("GET", "/api/consumption/mirror", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── Track Event Tests ────────────────────────────────────────────────────


class TestTrackEvent:
    @patch("consumption_engine.handler.get_dynamo_table")
    def test_tracks_valid_event(self, mock_get_table):
        table, store = _mock_table()
        mock_get_table.return_value = table
        resp = track_event("u1", "view", "item-1", {"source": "search"})
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["event_type"] == "view"
        assert body["item_id"] == "item-1"
        assert body["metadata"] == {"source": "search"}
        assert "event_id" in body
        assert "timestamp" in body

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_tracks_search_event_without_item_id(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = track_event("u1", "search", None, {"query": "laptop"})
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["item_id"] == ""

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_tracks_borrow_event(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = track_event("u1", "borrow", "item-2", None)
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["event_type"] == "borrow"
        assert body["metadata"] == {}

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_tracks_buy_event(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = track_event("u1", "buy", "item-3", None)
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["event_type"] == "buy"

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_invalid_event_type_returns_400(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = track_event("u1", "invalid_type", "item-1", None)
        assert resp["statusCode"] == 400
        assert "Invalid event_type" in json.loads(resp["body"])["message"]

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_missing_user_id_returns_401(self, mock_get_table):
        body = {"event_type": "view", "item_id": "item-1"}
        event = _api_event("POST", "/api/events", body=body)
        resp = handler(event, None)
        assert resp["statusCode"] == 401

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_missing_body_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/events", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Get Consumption Profile Tests ────────────────────────────────────────


class TestGetConsumptionProfile:
    @patch("consumption_engine.handler.get_dynamo_table")
    def test_returns_profile(self, mock_get_table):
        profile_data = {
            "user_id": "u1",
            "total_borrows": 5,
            "total_purchases": 2,
            "total_co2_saved_kg": 10.5,
            "total_money_saved": 200,
            "category_borrow_counts": {"electronics": 3, "furniture": 2},
        }
        table, _ = _mock_table({"u1": profile_data})
        mock_get_table.return_value = table
        resp = get_consumption_profile("u1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["total_borrows"] == 5
        assert body["total_purchases"] == 2
        assert body["total_co2_saved_kg"] == 10.5
        assert body["total_money_saved"] == 200
        assert body["category_borrow_counts"]["electronics"] == 3

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_profile_not_found_returns_404(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = get_consumption_profile("nonexistent")
        assert resp["statusCode"] == 404

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_missing_user_id_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/consumption/profile")
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── Get Mirror Data Tests ────────────────────────────────────────────────


class TestGetMirrorData:
    @patch("consumption_engine.handler.get_dynamo_table")
    def test_returns_mirror_data(self, mock_get_table):
        profile_data = {
            "user_id": "u1",
            "total_borrows": 3,
            "total_purchases": 1,
            "total_co2_saved_kg": 7.0,
            "total_money_saved": 100,
        }
        table, _ = _mock_table({"u1": profile_data})
        mock_get_table.return_value = table
        resp = get_mirror_data("u1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["total_borrows"] == 3
        assert body["total_purchases"] == 1
        assert body["total_co2_saved_kg"] == 7.0
        assert body["total_money_saved"] == 100

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_returns_zeroed_data_for_new_user(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = get_mirror_data("new_user")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "new_user"
        assert body["total_borrows"] == 0
        assert body["total_purchases"] == 0
        assert body["total_co2_saved_kg"] == 0
        assert body["total_money_saved"] == 0

    @patch("consumption_engine.handler.get_dynamo_table")
    def test_missing_user_id_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/consumption/mirror")
        resp = handler(event, None)
        assert resp["statusCode"] == 401
