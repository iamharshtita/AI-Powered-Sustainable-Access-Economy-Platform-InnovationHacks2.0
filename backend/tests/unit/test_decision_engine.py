"""Unit tests for the Decision Engine handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

# Must set env vars before importing the handler
os.environ.setdefault("USERS_TABLE", "test-users")
os.environ.setdefault("ITEMS_TABLE", "test-items")
os.environ.setdefault("TRANSACTIONS_TABLE", "test-transactions")
os.environ.setdefault("AI_SERVICE_SECRET_ARN", "arn:aws:secretsmanager:us-east-1:123456789:secret:test")

import decision_engine.handler as de_module
from decision_engine.handler import (
    handler,
    get_recommendation,
    generate_sentient_narration,
)


@pytest.fixture(autouse=True)
def _reset_cache():
    """Reset the module-level AI key cache between tests."""
    de_module._ai_key_cache = None
    yield
    de_module._ai_key_cache = None


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    path_params: dict | None = None,
    query_params: dict | None = None,
    user_id: str = "test-user-123",
) -> dict:
    """Build a minimal API Gateway proxy event."""
    return {
        "httpMethod": method,
        "resource": resource,
        "body": None,
        "queryStringParameters": query_params,
        "pathParameters": path_params,
        "requestContext": {
            "authorizer": {"principalId": user_id},
        },
    }


def _make_item(
    item_id: str = "item-1",
    category: str = "electronics",
    condition: str = "good",
    title: str = "Test Item",
    description: str = "A test item",
) -> dict:
    return {
        "item_id": item_id,
        "category": category,
        "condition": condition,
        "title": title,
        "description": description,
        "pricing": {"borrow_price_per_day": 5, "resale_price": 50},
        "status": "active",
    }


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    def test_unknown_route_returns_404(self):
        event = _api_event("GET", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("decision_engine.handler._get_item")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    def test_recommendation_route_dispatches(self, mock_txns, mock_item):
        mock_item.return_value = _make_item()
        event = _api_event(
            "GET",
            "/api/recommendations/{item_id}",
            path_params={"item_id": "item-1"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    def test_missing_item_id_returns_400(self):
        event = _api_event(
            "GET",
            "/api/recommendations/{item_id}",
            path_params={},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_missing_user_id_returns_401(self):
        event = _api_event(
            "GET",
            "/api/recommendations/{item_id}",
            path_params={"item_id": "item-1"},
            user_id="user",  # placeholder value from authorizer
        )
        # user_id="user" is treated as the placeholder, so falls back to query params
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── get_recommendation Tests ─────────────────────────────────────────────


class TestGetRecommendation:
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_default_recommendation_is_borrow(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(condition="fair")
        resp = get_recommendation("user-1", "item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["recommendation"] == "borrow"
        assert body["co2_saved"] > 0

    @patch("decision_engine.handler._get_user_transactions")
    @patch("decision_engine.handler._get_item")
    def test_borrowed_category_recommends_borrow(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="electronics", condition="new")
        mock_txns.return_value = [
            {"type": "borrow", "category": "electronics", "item_id": "other-item"},
        ]
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["recommendation"] == "borrow"

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_new_condition_recommends_buy_resale(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(condition="new")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["recommendation"] == "buy_resale"

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_like_new_condition_recommends_buy_resale(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(condition="like_new")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["recommendation"] == "buy_resale"

    @patch("decision_engine.handler._get_item")
    def test_item_not_found_returns_404(self, mock_item):
        mock_item.return_value = None
        resp = get_recommendation("user-1", "nonexistent")
        assert resp["statusCode"] == 404

    def test_empty_user_id_returns_400(self):
        resp = get_recommendation("", "item-1")
        assert resp["statusCode"] == 400

    def test_empty_item_id_returns_400(self):
        resp = get_recommendation("user-1", "")
        assert resp["statusCode"] == 400


# ── CO2 Estimates Tests ──────────────────────────────────────────────────


class TestCO2Estimates:
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_electronics_co2(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="electronics")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 15.0

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_furniture_co2(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="furniture")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 25.0

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_clothing_co2(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="clothing")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 5.0

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_books_co2(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="books")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 2.0

    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_unknown_category_uses_default_co2(self, mock_item, mock_txns):
        mock_item.return_value = _make_item(category="toys")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 10.0


# ── Graceful Degradation Tests ───────────────────────────────────────────


class TestGracefulDegradation:
    @patch("decision_engine.handler._is_ai_service_available", return_value=False)
    @patch("decision_engine.handler._get_item")
    def test_ai_unavailable_returns_all_options(self, mock_item, mock_ai):
        mock_item.return_value = _make_item()
        resp = get_recommendation("user-1", "item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["recommendation"] is None
        assert set(body["options"]) == {"borrow", "buy_resale", "buy_new"}
        assert "unavailable" in body["explanation"].lower()

    @patch("decision_engine.handler._is_ai_service_available", return_value=False)
    @patch("decision_engine.handler._get_item")
    def test_ai_unavailable_still_returns_co2(self, mock_item, mock_ai):
        mock_item.return_value = _make_item(category="furniture")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 25.0


# ── Sentient Narration Tests ─────────────────────────────────────────────


class TestSentientNarration:
    def test_narration_contains_listing_fields(self):
        listing = {
            "title": "Vintage Lamp",
            "category": "furniture",
            "condition": "good",
            "description": "A beautiful vintage lamp from the 1960s",
        }
        narration = generate_sentient_narration(listing)
        assert "Vintage Lamp" in narration
        assert "furniture" in narration
        assert "good" in narration
        assert "1960s" in narration
        assert "new home" in narration

    def test_narration_is_non_empty(self):
        listing = {"title": "X", "category": "Y", "condition": "Z", "description": "D"}
        narration = generate_sentient_narration(listing)
        assert len(narration) > 0

    def test_narration_handles_missing_fields(self):
        narration = generate_sentient_narration({})
        assert len(narration) > 0
        assert "new home" in narration

    def test_narration_is_first_person(self):
        listing = {
            "title": "Book",
            "category": "books",
            "condition": "like_new",
            "description": "A great read",
        }
        narration = generate_sentient_narration(listing)
        assert narration.startswith("Hi, I'm")


# ── User ID Extraction Tests ─────────────────────────────────────────────


class TestUserIdExtraction:
    @patch("decision_engine.handler._get_item")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    def test_user_id_from_authorizer(self, mock_txns, mock_item):
        mock_item.return_value = _make_item()
        event = _api_event(
            "GET",
            "/api/recommendations/{item_id}",
            path_params={"item_id": "item-1"},
            user_id="auth-user-456",
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("decision_engine.handler._get_item")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    def test_user_id_from_query_params(self, mock_txns, mock_item):
        mock_item.return_value = _make_item()
        event = _api_event(
            "GET",
            "/api/recommendations/{item_id}",
            path_params={"item_id": "item-1"},
            user_id="user",  # placeholder
            query_params={"user_id": "query-user-789"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200
