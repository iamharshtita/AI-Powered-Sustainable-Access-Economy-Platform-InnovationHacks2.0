"""Unit tests for the Reward Engine handler."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from reward_engine.handler import (
    handler,
    award_points,
    redeem_points,
    deduct_points,
    get_balance,
    POINTS_MAP,
    MIN_REDEMPTION_POINTS,
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


def _mock_users_table(users: dict | None = None):
    """Return a mock DynamoDB table pre-loaded with user records keyed by user_id."""
    table = MagicMock()
    store = dict(users) if users else {}

    def get_item(Key):
        uid = Key.get("user_id")
        item = store.get(uid)
        return {"Item": item} if item else {}

    def update_item(Key, UpdateExpression, ExpressionAttributeValues):
        uid = Key.get("user_id")
        if uid in store:
            store[uid]["reward_points"] = ExpressionAttributeValues[":bal"]

    table.get_item = MagicMock(side_effect=get_item)
    table.update_item = MagicMock(side_effect=update_item)
    return table, store


def _mock_txn_table(transactions: dict | None = None):
    """Return a mock DynamoDB table pre-loaded with transactions keyed by transaction_id."""
    table = MagicMock()
    store = dict(transactions) if transactions else {}

    def get_item(Key):
        tid = Key.get("transaction_id")
        item = store.get(tid)
        return {"Item": item} if item else {}

    table.get_item = MagicMock(side_effect=get_item)
    return table, store


def _setup_tables(mock_get_table, users=None, transactions=None):
    """Wire mock_get_table to return the right mock table per table name.

    Patches the module-level table name constants so routing works correctly.
    """
    import reward_engine.handler as reh
    reh.USERS_TABLE = "test-Users"
    reh.TRANSACTIONS_TABLE = "test-Transactions"

    users_tbl, users_store = _mock_users_table(users)
    txn_tbl, txn_store = _mock_txn_table(transactions)

    def side_effect(name):
        if name == "test-Users":
            return users_tbl
        if name == "test-Transactions":
            return txn_tbl
        return users_tbl

    mock_get_table.side_effect = side_effect
    return users_tbl, users_store, txn_tbl, txn_store


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("reward_engine.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_route(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 0}})
        body = {"transaction_id": "txn-1", "action_type": "borrow"}
        event = _api_event("POST", "/api/rewards/award", body=body, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_route(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 200}})
        body = {"points": 100}
        event = _api_event("POST", "/api/rewards/redeem", body=body, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("reward_engine.handler.get_dynamo_table")
    def test_balance_route(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 100}})
        event = _api_event("GET", "/api/rewards/balance", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── Award Points Tests ───────────────────────────────────────────────────


class TestAwardPoints:
    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_borrow_points(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 100}})
        resp = award_points("u1", "txn-1", "borrow")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["points_awarded"] == 50
        assert body["new_balance"] == 150

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_resale_purchase_points(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 0}})
        resp = award_points("u1", "txn-2", "resale_purchase")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["points_awarded"] == 30
        assert body["new_balance"] == 30

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_invalid_action_type(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 0}})
        resp = award_points("u1", "txn-3", "buy_new")
        assert resp["statusCode"] == 400

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_user_not_found(self, mock_get_table):
        _setup_tables(mock_get_table, users={})
        resp = award_points("nonexistent", "txn-4", "borrow")
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_missing_user_id_returns_401(self, mock_get_table):
        body = {"transaction_id": "txn-1", "action_type": "borrow"}
        event = _api_event("POST", "/api/rewards/award", body=body)
        resp = handler(event, None)
        assert resp["statusCode"] == 401

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_missing_body_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/rewards/award", user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("reward_engine.handler.get_dynamo_table")
    def test_award_missing_fields_returns_400(self, mock_get_table):
        body = {"transaction_id": "txn-1"}  # missing action_type
        event = _api_event("POST", "/api/rewards/award", body=body, user_id="u1")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Redeem Points Tests ──────────────────────────────────────────────────


class TestRedeemPoints:
    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_sufficient_balance(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 500}})
        resp = redeem_points("u1", 200)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert body["new_balance"] == 300
        assert body["discount"] == 20.0  # 200 / 100 * 10

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_exact_balance(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 100}})
        resp = redeem_points("u1", 100)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["success"] is True
        assert body["new_balance"] == 0
        assert body["discount"] == 10.0

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_insufficient_balance(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 50}})
        resp = redeem_points("u1", 100)
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["error"] == "INSUFFICIENT_POINTS"

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_below_minimum(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 500}})
        resp = redeem_points("u1", 50)
        assert resp["statusCode"] == 400

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_user_not_found(self, mock_get_table):
        _setup_tables(mock_get_table, users={})
        resp = redeem_points("nonexistent", 100)
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_redeem_missing_user_id_returns_401(self, mock_get_table):
        body = {"points": 100}
        event = _api_event("POST", "/api/rewards/redeem", body=body)
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── Deduct Points Tests ──────────────────────────────────────────────────


class TestDeductPoints:
    @patch("reward_engine.handler.get_dynamo_table")
    def test_deduct_points_on_cancellation(self, mock_get_table):
        _setup_tables(
            mock_get_table,
            users={"u1": {"user_id": "u1", "reward_points": 200}},
            transactions={"txn-1": {"transaction_id": "txn-1", "reward_points_awarded": 50}},
        )
        resp = deduct_points("u1", "txn-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["points_deducted"] == 50
        assert body["new_balance"] == 150

    @patch("reward_engine.handler.get_dynamo_table")
    def test_deduct_does_not_go_below_zero(self, mock_get_table):
        _setup_tables(
            mock_get_table,
            users={"u1": {"user_id": "u1", "reward_points": 20}},
            transactions={"txn-1": {"transaction_id": "txn-1", "reward_points_awarded": 50}},
        )
        resp = deduct_points("u1", "txn-1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["new_balance"] == 0

    @patch("reward_engine.handler.get_dynamo_table")
    def test_deduct_transaction_not_found(self, mock_get_table):
        _setup_tables(
            mock_get_table,
            users={"u1": {"user_id": "u1", "reward_points": 100}},
            transactions={},
        )
        resp = deduct_points("u1", "nonexistent")
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_deduct_user_not_found(self, mock_get_table):
        _setup_tables(
            mock_get_table,
            users={},
            transactions={"txn-1": {"transaction_id": "txn-1", "reward_points_awarded": 50}},
        )
        resp = deduct_points("nonexistent", "txn-1")
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_deduct_missing_user_id_returns_401(self, mock_get_table):
        body = {"transaction_id": "txn-1"}
        event = _api_event("POST", "/api/rewards/deduct", body=body)
        resp = handler(event, None)
        assert resp["statusCode"] == 401


# ── Get Balance Tests ────────────────────────────────────────────────────


class TestGetBalance:
    @patch("reward_engine.handler.get_dynamo_table")
    def test_returns_balance(self, mock_get_table):
        _setup_tables(mock_get_table, users={"u1": {"user_id": "u1", "reward_points": 350}})
        resp = get_balance("u1")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["user_id"] == "u1"
        assert body["reward_points"] == 350

    @patch("reward_engine.handler.get_dynamo_table")
    def test_user_not_found(self, mock_get_table):
        _setup_tables(mock_get_table, users={})
        resp = get_balance("nonexistent")
        assert resp["statusCode"] == 404

    @patch("reward_engine.handler.get_dynamo_table")
    def test_missing_user_id_returns_401(self, mock_get_table):
        event = _api_event("GET", "/api/rewards/balance")
        resp = handler(event, None)
        assert resp["statusCode"] == 401
