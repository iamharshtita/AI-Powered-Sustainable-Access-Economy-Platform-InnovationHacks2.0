"""Unit tests for the CO2 Tracker handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from co2_tracker.handler import (
    handler,
    calculate_co2_saved,
    get_cumulative_savings,
    CO2_ESTIMATES,
    CO2_DEFAULT,
)


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    path_params: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    return {
        "httpMethod": method,
        "resource": resource,
        "pathParameters": path_params,
        "queryStringParameters": {"user_id": user_id} if user_id else None,
        "requestContext": {"authorizer": {}},
    }


def _mock_table(items: dict | None = None):
    """Return a mock DynamoDB table with optional pre-loaded items keyed by PK."""
    table = MagicMock()
    store = dict(items) if items else {}

    def get_item(Key):
        pk = list(Key.values())[0]
        item = store.get(pk)
        return {"Item": item} if item else {}

    table.get_item = MagicMock(side_effect=get_item)
    return table, store


# ── calculate_co2_saved Tests ────────────────────────────────────────────


class TestCalculateCo2Saved:
    def test_borrow_electronics(self):
        assert calculate_co2_saved("electronics", "borrow") == 15.0

    def test_borrow_furniture(self):
        assert calculate_co2_saved("furniture", "borrow") == 25.0

    def test_borrow_clothing(self):
        assert calculate_co2_saved("clothing", "borrow") == 5.0

    def test_borrow_books(self):
        assert calculate_co2_saved("books", "borrow") == 2.0

    def test_borrow_unknown_category_uses_default(self):
        assert calculate_co2_saved("toys", "borrow") == CO2_DEFAULT

    def test_buy_resale_returns_positive(self):
        assert calculate_co2_saved("electronics", "buy_resale") == 15.0

    def test_buy_new_returns_zero(self):
        assert calculate_co2_saved("electronics", "buy_new") == 0.0

    def test_buy_new_any_category_returns_zero(self):
        assert calculate_co2_saved("furniture", "buy_new") == 0.0

    def test_unknown_action_type_returns_zero(self):
        assert calculate_co2_saved("electronics", "unknown") == 0.0

    def test_case_insensitive_category(self):
        assert calculate_co2_saved("Electronics", "borrow") == 15.0
        assert calculate_co2_saved("FURNITURE", "buy_resale") == 25.0


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("co2_tracker.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_transaction_co2_route(self, mock_get_table):
        txn = {"transaction_id": "t1", "item_id": "i1", "type": "borrow"}
        item = {"item_id": "i1", "category": "electronics"}
        store = {"t1": txn, "i1": item}
        table, _ = _mock_table(store)
        mock_get_table.return_value = table
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "t1"},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_cumulative_route(self, mock_get_table):
        profile = {
            "user_id": "u1",
            "total_co2_saved_kg": 50.0,
            "total_money_saved": 300.0,
        }
        table, _ = _mock_table({"u1": profile})
        mock_get_table.return_value = table
        event = _api_event("GET", "/api/co2/cumulative", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── Transaction CO2 Endpoint Tests ──────────────────────────────────────


class TestTransactionCo2:
    @patch("co2_tracker.handler.get_dynamo_table")
    def test_returns_co2_for_borrow(self, mock_get_table):
        txn = {"transaction_id": "t1", "item_id": "i1", "type": "borrow"}
        item = {"item_id": "i1", "category": "electronics"}
        table, _ = _mock_table({"t1": txn, "i1": item})
        mock_get_table.return_value = table
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "t1"},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["co2_saved_kg"] == 15.0
        assert body["transaction_id"] == "t1"
        assert body["category"] == "electronics"
        assert body["action_type"] == "borrow"

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_returns_zero_for_buy_new(self, mock_get_table):
        txn = {"transaction_id": "t2", "item_id": "i2", "type": "buy_new"}
        item = {"item_id": "i2", "category": "furniture"}
        table, _ = _mock_table({"t2": txn, "i2": item})
        mock_get_table.return_value = table
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "t2"},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["co2_saved_kg"] == 0.0

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_transaction_not_found_returns_404(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "nonexistent"},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_missing_transaction_id_returns_400(self, mock_get_table):
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_missing_user_returns_401(self, mock_get_table):
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "t1"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 401

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_item_not_found_uses_empty_category(self, mock_get_table):
        txn = {"transaction_id": "t3", "item_id": "missing-item", "type": "borrow"}
        table, _ = _mock_table({"t3": txn})
        mock_get_table.return_value = table
        event = _api_event(
            "GET",
            "/api/co2/transaction/{transaction_id}",
            path_params={"transaction_id": "t3"},
            user_id="u1",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        # Empty category falls back to CO2_DEFAULT
        assert body["co2_saved_kg"] == CO2_DEFAULT


# ── Cumulative Savings Endpoint Tests ────────────────────────────────────


class TestCumulativeSavings:
    @patch("co2_tracker.handler.get_dynamo_table")
    def test_returns_cumulative_data(self, mock_get_table):
        profile = {
            "user_id": "u1",
            "total_co2_saved_kg": 42.5,
            "total_money_saved": 250.0,
        }
        table, _ = _mock_table({"u1": profile})
        mock_get_table.return_value = table
        resp = get_cumulative_savings("u1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["total_co2_saved_kg"] == 42.5
        assert body["total_money_saved"] == 250.0

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_returns_zeros_for_new_user(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = get_cumulative_savings("new_user")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "new_user"
        assert body["total_co2_saved_kg"] == 0.0
        assert body["total_money_saved"] == 0.0

    @patch("co2_tracker.handler.get_dynamo_table")
    def test_missing_user_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/co2/cumulative")
        resp = handler(event, None)
        assert resp["statusCode"] == 401
