"""Unit tests for the Lifecycle Agent handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from lifecycle_agent.handler import (
    handler,
    get_borrow_frequency,
    generate_buy_suggestion,
    generate_nudge,
    BUY_SUGGESTION_THRESHOLD,
)


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    user_id: str | None = None,
    query_params: dict | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    params = dict(query_params or {})
    if user_id:
        params["user_id"] = user_id
    event: dict = {
        "httpMethod": method,
        "resource": resource,
        "body": None,
        "queryStringParameters": params if params else None,
        "requestContext": {"authorizer": {}},
    }
    return event


def _mock_profiles_table(profiles: dict | None = None):
    """Return a mock DynamoDB table with optional pre-loaded profiles."""
    table = MagicMock()
    store = dict(profiles) if profiles else {}

    def get_item(Key):
        pk = Key.get("user_id")
        item = store.get(pk)
        return {"Item": item} if item else {}

    table.get_item = MagicMock(side_effect=get_item)
    return table


def _mock_items_table(items: dict | None = None):
    """Return a mock DynamoDB table for items with get_item and query."""
    table = MagicMock()
    store = dict(items) if items else {}

    def get_item(Key):
        pk = Key.get("item_id")
        item = store.get(pk)
        return {"Item": item} if item else {}

    def query(**kwargs):
        # Return items matching the category from the store
        return {"Items": [v for v in store.values() if v.get("status") == "active"]}

    table.get_item = MagicMock(side_effect=get_item)
    table.query = MagicMock(side_effect=query)
    return table


def _mock_events_table(events: list | None = None):
    """Return a mock DynamoDB table for events with query support."""
    table = MagicMock()

    def query(**kwargs):
        return {"Items": events or []}

    table.query = MagicMock(side_effect=query)
    return table


def _get_table_router(profiles_table, items_table=None, events_table=None):
    """Return a function that routes get_dynamo_table calls to the right mock."""
    def router(table_name):
        if "ConsumptionProfiles" in table_name or "consumption" in table_name.lower():
            return profiles_table
        if "Items" in table_name or "items" in table_name.lower():
            return items_table or MagicMock()
        if "Events" in table_name or "events" in table_name.lower():
            return events_table or MagicMock()
        return MagicMock()
    return router


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_nudges_route(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {},
        }})
        mock_get_table.return_value = profiles
        event = _api_event("GET", "/api/nudges", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_suggestions_route(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 5},
        }})
        mock_get_table.return_value = profiles
        event = _api_event("GET", "/api/suggestions", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_nudges_missing_user_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/nudges")
        resp = handler(event, None)
        assert resp["statusCode"] == 401

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_suggestions_missing_user_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/suggestions")
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── get_borrow_frequency Tests ───────────────────────────────────────────


class TestGetBorrowFrequency:
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_count_for_existing_category(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 5, "furniture": 2},
        }})
        mock_get_table.return_value = profiles
        assert get_borrow_frequency("u1", "electronics") == 5
        assert get_borrow_frequency("u1", "furniture") == 2

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_zero_for_unknown_category(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 3},
        }})
        mock_get_table.return_value = profiles
        assert get_borrow_frequency("u1", "clothing") == 0

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_zero_for_missing_profile(self, mock_get_table):
        profiles = _mock_profiles_table()
        mock_get_table.return_value = profiles
        assert get_borrow_frequency("nonexistent", "electronics") == 0


# ── generate_buy_suggestion Tests ────────────────────────────────────────


class TestGenerateBuySuggestion:
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_generates_suggestion_at_threshold(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 3},
        }})
        mock_get_table.return_value = profiles
        result = generate_buy_suggestion("u1", "electronics")
        assert result is not None
        assert result["category"] == "electronics"
        assert result["borrow_count"] == 3
        assert "continued_borrowing_cost" in result
        assert "purchase_cost" in result
        assert "suggestion" in result
        assert result["continued_borrowing_cost"] > 0
        assert result["purchase_cost"] > 0

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_generates_suggestion_above_threshold(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"furniture": 7},
        }})
        mock_get_table.return_value = profiles
        result = generate_buy_suggestion("u1", "furniture")
        assert result is not None
        assert result["borrow_count"] == 7

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_none_below_threshold(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 2},
        }})
        mock_get_table.return_value = profiles
        result = generate_buy_suggestion("u1", "electronics")
        assert result is None

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_none_for_zero_borrows(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {},
        }})
        mock_get_table.return_value = profiles
        result = generate_buy_suggestion("u1", "electronics")
        assert result is None


# ── generate_nudge Tests ─────────────────────────────────────────────────


class TestGenerateNudge:
    @patch.dict(os.environ, {
        "ITEMS_TABLE": "test-Items",
        "CONSUMPTION_PROFILES_TABLE": "test-ConsumptionProfiles",
    })
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_generates_nudge_for_new_category_purchase(self, mock_get_table):
        """Nudge when user purchases in a category they haven't borrowed in,
        and borrowing options exist."""
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {},
        }})
        items = _mock_items_table({
            "item-1": {
                "item_id": "item-1",
                "category": "electronics",
                "status": "active",
                "title": "Laptop",
            },
            "item-2": {
                "item_id": "item-2",
                "category": "electronics",
                "status": "active",
                "title": "Tablet",
            },
        })
        mock_get_table.side_effect = _get_table_router(profiles, items)
        result = generate_nudge("u1", "item-1")
        assert result is not None
        assert "nudge" in result
        assert result["category"] == "electronics"
        assert result["item_id"] == "item-1"
        assert result["borrowable_count"] > 0

    @patch.dict(os.environ, {
        "ITEMS_TABLE": "test-Items",
        "CONSUMPTION_PROFILES_TABLE": "test-ConsumptionProfiles",
    })
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_no_nudge_when_user_already_borrows_category(self, mock_get_table):
        """No nudge when user has already borrowed in this category."""
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 2},
        }})
        items = _mock_items_table({
            "item-1": {
                "item_id": "item-1",
                "category": "electronics",
                "status": "active",
            },
        })
        mock_get_table.side_effect = _get_table_router(profiles, items)
        result = generate_nudge("u1", "item-1")
        assert result is None

    @patch.dict(os.environ, {
        "ITEMS_TABLE": "test-Items",
        "CONSUMPTION_PROFILES_TABLE": "test-ConsumptionProfiles",
    })
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_no_nudge_when_item_not_found(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {},
        }})
        items = _mock_items_table()
        mock_get_table.side_effect = _get_table_router(profiles, items)
        result = generate_nudge("u1", "nonexistent")
        assert result is None

    @patch.dict(os.environ, {
        "ITEMS_TABLE": "test-Items",
        "CONSUMPTION_PROFILES_TABLE": "test-ConsumptionProfiles",
    })
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_no_nudge_when_no_borrowable_items(self, mock_get_table):
        """No nudge when no active borrowing options exist in the category."""
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {},
        }})
        items = _mock_items_table({
            "item-1": {
                "item_id": "item-1",
                "category": "electronics",
                "status": "inactive",
            },
        })
        mock_get_table.side_effect = _get_table_router(profiles, items)
        result = generate_nudge("u1", "item-1")
        assert result is None


# ── Suggestions Endpoint Tests ───────────────────────────────────────────


class TestSuggestionsEndpoint:
    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_suggestions_for_qualifying_categories(self, mock_get_table):
        profiles = _mock_profiles_table({"u1": {
            "user_id": "u1",
            "category_borrow_counts": {"electronics": 5, "books": 1},
        }})
        mock_get_table.return_value = profiles
        event = _api_event("GET", "/api/suggestions", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert len(body["suggestions"]) == 1
        assert body["suggestions"][0]["category"] == "electronics"

    @patch("lifecycle_agent.handler.get_dynamo_table")
    def test_returns_empty_suggestions_for_new_user(self, mock_get_table):
        profiles = _mock_profiles_table()
        mock_get_table.return_value = profiles
        event = _api_event("GET", "/api/suggestions", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["suggestions"] == []
