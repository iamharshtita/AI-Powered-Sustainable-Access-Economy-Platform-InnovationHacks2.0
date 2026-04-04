"""Unit tests for the Decision Engine handler (Bedrock-powered)."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

os.environ.setdefault("USERS_TABLE", "test-users")
os.environ.setdefault("ITEMS_TABLE", "test-items")
os.environ.setdefault("TRANSACTIONS_TABLE", "test-transactions")

import decision_engine.handler as de_module
from decision_engine.handler import (
    handler,
    get_recommendation,
    generate_sentient_narration,
    _parse_recommendation,
)


@pytest.fixture(autouse=True)
def _reset_cache():
    de_module._bedrock_client = None
    yield
    de_module._bedrock_client = None


def _api_event(method, resource, path_params=None, query_params=None, user_id="test-user-123"):
    return {
        "httpMethod": method, "resource": resource, "body": None,
        "queryStringParameters": query_params, "pathParameters": path_params,
        "requestContext": {"authorizer": {"principalId": user_id}},
    }


def _make_item(item_id="item-1", category="electronics", condition="good",
               title="Test Item", description="A test item"):
    return {"item_id": item_id, "category": category, "condition": condition,
            "title": title, "description": description,
            "pricing": {"borrow_price_per_day": 5, "resale_price": 50}, "status": "active"}


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    def test_unknown_route_returns_404(self):
        resp = handler(_api_event("GET", "/api/unknown"), None)
        assert resp["statusCode"] == 404

    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: borrow\nEXPLANATION: Sustainable choice")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_recommendation_route_dispatches(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = handler(_api_event("GET", "/api/recommendations/{item_id}", path_params={"item_id": "item-1"}), None)
        assert resp["statusCode"] == 200

    def test_missing_item_id_returns_400(self):
        resp = handler(_api_event("GET", "/api/recommendations/{item_id}", path_params={}), None)
        assert resp["statusCode"] == 400

    def test_missing_user_id_returns_401(self):
        resp = handler(_api_event("GET", "/api/recommendations/{item_id}", path_params={"item_id": "item-1"}, user_id="user"), None)
        assert resp["statusCode"] == 401


# ── Recommendation with Bedrock Tests ────────────────────────────────────


class TestGetRecommendation:
    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: borrow\nEXPLANATION: Borrowing saves CO2")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_bedrock_borrow_recommendation(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = get_recommendation("user-1", "item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["recommendation"] == "borrow"
        assert body["co2_saved"] == 15.0
        mock_bedrock.assert_called_once()

    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: buy_resale\nEXPLANATION: Great condition item")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_bedrock_buy_resale_recommendation(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item(condition="new")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["recommendation"] == "buy_resale"
        assert body["co2_saved"] == 15.0

    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: buy_new\nEXPLANATION: No alternatives")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_buy_new_has_zero_co2(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["recommendation"] == "buy_new"
        assert body["co2_saved"] == 0.0

    @patch("decision_engine.handler._get_item")
    def test_item_not_found_returns_404(self, mock_item):
        mock_item.return_value = None
        resp = get_recommendation("user-1", "nonexistent")
        assert resp["statusCode"] == 404

    def test_empty_user_id_returns_400(self):
        assert get_recommendation("", "item-1")["statusCode"] == 400

    def test_empty_item_id_returns_400(self):
        assert get_recommendation("user-1", "")["statusCode"] == 400


# ── Graceful Degradation Tests ───────────────────────────────────────────


class TestGracefulDegradation:
    @patch("decision_engine.handler._call_bedrock", return_value=None)
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_bedrock_failure_returns_all_options(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = get_recommendation("user-1", "item-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["recommendation"] is None
        assert set(body["options"]) == {"borrow", "buy_resale", "buy_new"}
        assert "unavailable" in body["explanation"].lower()

    @patch("decision_engine.handler._call_bedrock", return_value=None)
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_bedrock_failure_still_returns_co2(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item(category="furniture")
        resp = get_recommendation("user-1", "item-1")
        body = json.loads(resp["body"])
        assert body["co2_saved"] == 25.0


# ── Parse Recommendation Tests ───────────────────────────────────────────


class TestParseRecommendation:
    def test_parses_valid_response(self):
        rec, exp = _parse_recommendation("RECOMMENDATION: borrow\nEXPLANATION: Good choice")
        assert rec == "borrow"
        assert exp == "Good choice"

    def test_parses_buy_resale(self):
        rec, _ = _parse_recommendation("RECOMMENDATION: buy_resale\nEXPLANATION: Quality item")
        assert rec == "buy_resale"

    def test_defaults_to_borrow_on_invalid(self):
        rec, _ = _parse_recommendation("Some random text without format")
        assert rec == "borrow"

    def test_handles_extra_whitespace(self):
        rec, exp = _parse_recommendation("RECOMMENDATION:  buy_new \nEXPLANATION:  No alternatives ")
        assert rec == "buy_new"
        assert exp == "No alternatives"


# ── Sentient Narration Tests ─────────────────────────────────────────────


class TestSentientNarration:
    @patch("decision_engine.handler._call_bedrock", return_value="Hi, I'm a vintage lamp and I light up any room!")
    def test_bedrock_narration(self, mock_bedrock):
        listing = {"title": "Vintage Lamp", "category": "furniture", "condition": "good", "description": "Beautiful lamp"}
        narration = generate_sentient_narration(listing)
        assert "Hi, I'm" in narration
        mock_bedrock.assert_called_once()

    @patch("decision_engine.handler._call_bedrock", return_value=None)
    def test_fallback_narration_on_bedrock_failure(self, mock_bedrock):
        listing = {"title": "Lamp", "category": "furniture", "condition": "good", "description": "Nice lamp"}
        narration = generate_sentient_narration(listing)
        assert "Hi, I'm" in narration
        assert "new home" in narration

    @patch("decision_engine.handler._call_bedrock", return_value=None)
    def test_fallback_handles_missing_fields(self, mock_bedrock):
        narration = generate_sentient_narration({})
        assert len(narration) > 0


# ── User ID Extraction Tests ─────────────────────────────────────────────


class TestUserIdExtraction:
    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: borrow\nEXPLANATION: Good")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_user_id_from_authorizer(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = handler(_api_event("GET", "/api/recommendations/{item_id}", path_params={"item_id": "item-1"}, user_id="auth-user"), None)
        assert resp["statusCode"] == 200

    @patch("decision_engine.handler._call_bedrock", return_value="RECOMMENDATION: borrow\nEXPLANATION: Good")
    @patch("decision_engine.handler._get_user_transactions", return_value=[])
    @patch("decision_engine.handler._get_item")
    def test_user_id_from_query_params(self, mock_item, mock_txns, mock_bedrock):
        mock_item.return_value = _make_item()
        resp = handler(_api_event("GET", "/api/recommendations/{item_id}", path_params={"item_id": "item-1"}, user_id="user", query_params={"user_id": "q-user"}), None)
        assert resp["statusCode"] == 200
