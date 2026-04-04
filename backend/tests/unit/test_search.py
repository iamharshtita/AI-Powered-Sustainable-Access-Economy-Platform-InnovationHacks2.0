"""Unit tests for the Search Service handler."""

import base64
import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from search.handler import (
    handler,
    search_items,
    voice_search,
    RESULT_FIELDS,
)


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    body: dict | None = None,
    query_params: dict | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    return {
        "httpMethod": method,
        "resource": resource,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": query_params,
        "pathParameters": None,
        "requestContext": {"authorizer": {}},
    }


def _make_item(
    item_id: str = "item-1",
    title: str = "Laptop",
    description: str = "A powerful laptop",
    category: str = "electronics",
    condition: str = "good",
    status: str = "active",
) -> dict:
    """Return a sample item dict."""
    return {
        "item_id": item_id,
        "owner_id": "u1",
        "title": title,
        "description": description,
        "category": category,
        "condition": condition,
        "pricing": {"borrow_price_per_day": 5.0, "resale_price": 50.0},
        "status": status,
        "location": "NYC",
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    }


def _mock_table(items: list[dict] | None = None):
    """Return a mock DynamoDB table that scans from a list of items."""
    table = MagicMock()
    all_items = list(items) if items else []

    def scan(**kwargs):
        filter_expr = kwargs.get("FilterExpression", "")
        attr_values = kwargs.get("ExpressionAttributeValues", {})
        # Return all items — Python-level filtering happens in search_items
        return {"Items": all_items}

    table.scan = MagicMock(side_effect=scan)
    return table


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("search.handler.get_dynamo_table")
    def test_unknown_route_returns_404(self, mock_get_table):
        event = _api_event("PATCH", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("search.handler.get_dynamo_table")
    def test_text_search_route(self, mock_get_table):
        mock_get_table.return_value = _mock_table([_make_item()])
        event = _api_event("GET", "/api/search", query_params={"q": "laptop"})
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("search.handler.get_dynamo_table")
    def test_voice_search_route_missing_body(self, mock_get_table):
        event = _api_event("POST", "/api/search/voice")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Text Search Tests ────────────────────────────────────────────────────


class TestSearchItems:
    @patch("search.handler.get_dynamo_table")
    def test_returns_matching_items(self, mock_get_table):
        items = [
            _make_item(item_id="1", title="Gaming Laptop", description="Fast laptop"),
            _make_item(item_id="2", title="Desk Chair", description="Ergonomic chair"),
        ]
        mock_get_table.return_value = _mock_table(items)
        results = search_items("laptop")
        assert len(results) == 1
        assert results[0]["item_id"] == "1"

    @patch("search.handler.get_dynamo_table")
    def test_case_insensitive_match(self, mock_get_table):
        items = [_make_item(title="LAPTOP Pro", description="A device")]
        mock_get_table.return_value = _mock_table(items)
        results = search_items("laptop")
        assert len(results) == 1

    @patch("search.handler.get_dynamo_table")
    def test_matches_description(self, mock_get_table):
        items = [_make_item(title="Device", description="A powerful laptop for gaming")]
        mock_get_table.return_value = _mock_table(items)
        results = search_items("laptop")
        assert len(results) == 1

    @patch("search.handler.get_dynamo_table")
    def test_excludes_inactive_items(self, mock_get_table):
        items = [
            _make_item(item_id="1", title="Active Laptop", status="active"),
            _make_item(item_id="2", title="Inactive Laptop", status="inactive"),
        ]
        # The mock returns all items, but search_items filters by status in DynamoDB.
        # Since our mock doesn't filter, we need to simulate DynamoDB filtering.
        table = MagicMock()
        table.scan = MagicMock(return_value={"Items": [items[0]]})
        mock_get_table.return_value = table
        results = search_items("laptop")
        assert len(results) == 1
        assert results[0]["item_id"] == "1"

    @patch("search.handler.get_dynamo_table")
    def test_result_contains_required_fields(self, mock_get_table):
        mock_get_table.return_value = _mock_table([_make_item()])
        results = search_items("laptop")
        assert len(results) == 1
        for field in RESULT_FIELDS:
            assert field in results[0], f"Missing field: {field}"

    @patch("search.handler.get_dynamo_table")
    def test_no_results_for_unmatched_query(self, mock_get_table):
        mock_get_table.return_value = _mock_table([_make_item(title="Chair", description="Wooden chair")])
        results = search_items("laptop")
        assert len(results) == 0

    @patch("search.handler.get_dynamo_table")
    def test_empty_query_returns_validation_error(self, mock_get_table):
        event = _api_event("GET", "/api/search", query_params={"q": ""})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("search.handler.get_dynamo_table")
    def test_missing_q_param_returns_validation_error(self, mock_get_table):
        event = _api_event("GET", "/api/search", query_params={})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("search.handler.get_dynamo_table")
    def test_no_query_params_returns_validation_error(self, mock_get_table):
        event = _api_event("GET", "/api/search")
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── Voice Search Tests ───────────────────────────────────────────────────


class TestVoiceSearch:
    @patch("search.handler.VOICE_SERVICE_URL", "")
    @patch("search.handler.get_dynamo_table")
    def test_voice_search_no_service_url_returns_503(self, mock_get_table):
        audio = base64.b64encode(b"fake audio").decode()
        event = _api_event("POST", "/api/search/voice", body={"audio": audio})
        resp = handler(event, None)
        assert resp["statusCode"] == 503

    @patch("search.handler.get_dynamo_table")
    def test_voice_search_missing_audio_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/search/voice", body={"text": "hello"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("search.handler.get_dynamo_table")
    def test_voice_search_invalid_base64_returns_400(self, mock_get_table):
        event = _api_event("POST", "/api/search/voice", body={"audio": "!!!not-base64!!!"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    @patch("search.handler._transcribe_audio")
    @patch("search.handler.get_dynamo_table")
    def test_voice_search_delegates_to_text_search(self, mock_get_table, mock_transcribe):
        mock_transcribe.return_value = "laptop"
        mock_get_table.return_value = _mock_table([_make_item(title="Laptop")])
        results = voice_search(b"fake audio")
        assert len(results) == 1
        assert results[0]["title"] == "Laptop"
        mock_transcribe.assert_called_once_with(b"fake audio")

    @patch("search.handler._transcribe_audio")
    @patch("search.handler.get_dynamo_table")
    def test_voice_search_transcription_failure_raises(self, mock_get_table, mock_transcribe):
        mock_transcribe.return_value = None
        with pytest.raises(RuntimeError):
            voice_search(b"fake audio")
