"""Unit tests for the Auth/Trust Service handler."""

import json
import os
import sys
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from auth_trust.handler import (
    handler,
    update_trust_score,
    check_trust_access,
    get_profile,
    TRUST_SCORE_MIN,
    TRUST_SCORE_MAX,
    TRUST_SCORE_DEFAULT,
    TRUST_SUCCESS_DELTA,
    TRUST_FAILURE_DELTA,
    HIGH_VALUE_THRESHOLD,
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
    """Return a mock DynamoDB table with optional pre-loaded items keyed by user_id."""
    table = MagicMock()
    store = dict(items) if items else {}

    def get_item(Key):
        uid = Key["user_id"]
        item = store.get(uid)
        return {"Item": item} if item else {}

    def put_item(Item):
        store[Item["user_id"]] = Item

    def update_item(Key, UpdateExpression, ExpressionAttributeValues):
        uid = Key["user_id"]
        if uid in store:
            store[uid]["trust_score"] = ExpressionAttributeValues.get(":ts", store[uid].get("trust_score"))
            store[uid]["updated_at"] = ExpressionAttributeValues.get(":ua", store[uid].get("updated_at"))

    table.get_item = MagicMock(side_effect=get_item)
    table.put_item = MagicMock(side_effect=put_item)
    table.update_item = MagicMock(side_effect=update_item)
    return table, store


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("auth_trust.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("DELETE", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("auth_trust.handler.get_dynamo_table")
    def test_auth_callback_route(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        event = _api_event("POST", "/api/auth/callback", body={"user_id": "u1"})
        resp = handler(event, None)
        assert resp["statusCode"] == 201

    @patch("auth_trust.handler.get_dynamo_table")
    def test_get_profile_route(self, mock_get_table):
        table, _ = _mock_table({"u1": {
            "user_id": "u1", "trust_score": Decimal("75"), "reward_points": 100,
            "created_at": "2024-01-01T00:00:00+00:00", "updated_at": "2024-01-01T00:00:00+00:00",
        }})
        mock_get_table.return_value = table
        event = _api_event("GET", "/api/users/profile", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("auth_trust.handler.get_dynamo_table")
    def test_update_trust_route(self, mock_get_table):
        table, _ = _mock_table({"u1": {
            "user_id": "u1", "trust_score": Decimal("50"),
        }})
        mock_get_table.return_value = table
        event = _api_event("PUT", "/api/users/trust", body={"transaction_outcome": "success"}, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── Auth Callback Tests ──────────────────────────────────────────────────


class TestAuthCallback:
    @patch("auth_trust.handler.get_dynamo_table")
    def test_creates_new_user(self, mock_get_table):
        table, store = _mock_table()
        mock_get_table.return_value = table
        event = _api_event("POST", "/api/auth/callback", body={
            "user_id": "u1", "email": "test@example.com", "display_name": "Test User",
        })
        resp = handler(event, None)
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert "u1" in store

    @patch("auth_trust.handler.get_dynamo_table")
    def test_existing_user_returns_200(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("50")}})
        mock_get_table.return_value = table
        event = _api_event("POST", "/api/auth/callback", body={"user_id": "u1"})
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        assert "already exists" in json.loads(resp["body"])["message"]

    @patch("auth_trust.handler.get_dynamo_table")
    def test_missing_user_id_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/auth/callback", body={"email": "a@b.com"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("auth_trust.handler.get_dynamo_table")
    def test_missing_body_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/auth/callback")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── get_profile Tests ────────────────────────────────────────────────────


class TestGetProfile:
    @patch("auth_trust.handler.get_dynamo_table")
    def test_returns_profile_data(self, mock_get_table):
        table, _ = _mock_table({"u1": {
            "user_id": "u1",
            "display_name": "Alice",
            "trust_score": Decimal("80.5"),
            "reward_points": 250,
            "created_at": "2024-01-01T00:00:00+00:00",
            "updated_at": "2024-06-01T00:00:00+00:00",
        }})
        mock_get_table.return_value = table
        resp = get_profile("u1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["display_name"] == "Alice"
        assert body["trust_score"] == 80.5
        assert body["reward_points"] == 250

    @patch("auth_trust.handler.get_dynamo_table")
    def test_user_not_found(self, mock_get_table):
        table, _ = _mock_table()
        mock_get_table.return_value = table
        resp = get_profile("nonexistent")
        assert resp["statusCode"] == 404

    @patch("auth_trust.handler.get_dynamo_table")
    def test_missing_user_id_in_event_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/users/profile")
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── update_trust_score Tests ─────────────────────────────────────────────


class TestUpdateTrustScore:
    @patch("auth_trust.handler.get_dynamo_table")
    def test_success_increases_score(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("50")}})
        mock_get_table.return_value = table
        new_score = update_trust_score("u1", "success")
        assert new_score == 55.0

    @patch("auth_trust.handler.get_dynamo_table")
    def test_failure_decreases_score(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("50")}})
        mock_get_table.return_value = table
        new_score = update_trust_score("u1", "failure")
        assert new_score == 40.0

    @patch("auth_trust.handler.get_dynamo_table")
    def test_clamps_to_max(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("98")}})
        mock_get_table.return_value = table
        new_score = update_trust_score("u1", "success")
        assert new_score == TRUST_SCORE_MAX

    @patch("auth_trust.handler.get_dynamo_table")
    def test_clamps_to_min(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("3")}})
        mock_get_table.return_value = table
        new_score = update_trust_score("u1", "failure")
        assert new_score == TRUST_SCORE_MIN

    @patch("auth_trust.handler.get_dynamo_table")
    def test_invalid_outcome_raises(self, mock_get_table):
        with pytest.raises(ValueError, match="Invalid transaction_outcome"):
            update_trust_score("u1", "unknown")

    @patch("auth_trust.handler.get_dynamo_table")
    def test_put_route_invalid_outcome_returns_400(self, mock_get_table):
        event = _api_event("PUT", "/api/users/trust", body={"transaction_outcome": "bad"}, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("auth_trust.handler.get_dynamo_table")
    def test_put_route_missing_body_returns_400(self, mock_get_table):
        event = _api_event("PUT", "/api/users/trust", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── check_trust_access Tests ────────────────────────────────────────────


class TestCheckTrustAccess:
    @patch("auth_trust.handler.get_dynamo_table")
    def test_high_value_allowed_above_threshold(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("75")}})
        mock_get_table.return_value = table
        assert check_trust_access("u1", "high") is True

    @patch("auth_trust.handler.get_dynamo_table")
    def test_high_value_denied_below_threshold(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("30")}})
        mock_get_table.return_value = table
        assert check_trust_access("u1", "high") is False

    @patch("auth_trust.handler.get_dynamo_table")
    def test_high_value_allowed_at_threshold(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("50")}})
        mock_get_table.return_value = table
        assert check_trust_access("u1", "high") is True

    @patch("auth_trust.handler.get_dynamo_table")
    def test_standard_value_always_allowed(self, mock_get_table):
        table, _ = _mock_table({"u1": {"user_id": "u1", "trust_score": Decimal("10")}})
        mock_get_table.return_value = table
        assert check_trust_access("u1", "standard") is True
