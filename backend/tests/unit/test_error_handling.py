"""Unit tests for shared utility modules: response, sanitize, dynamo."""

import json
import sys
import os
import uuid

import pytest

# Make the shared package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

from shared.response import success_response, error_response, ErrorCode
from shared.sanitize import sanitize_pii


# ── response.py ──────────────────────────────────────────────────────────


class TestSuccessResponse:
    def test_default_status_code(self):
        resp = success_response({"ok": True})
        assert resp["statusCode"] == 200
        assert json.loads(resp["body"]) == {"ok": True}

    def test_custom_status_code(self):
        resp = success_response({"created": True}, status_code=201)
        assert resp["statusCode"] == 201

    def test_body_is_json_string(self):
        resp = success_response([1, 2, 3])
        assert isinstance(resp["body"], str)
        assert json.loads(resp["body"]) == [1, 2, 3]


class TestErrorResponse:
    def test_validation_error(self):
        resp = error_response(
            ErrorCode.VALIDATION_ERROR,
            "Missing required field: category",
            request_id="test-123",
        )
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["error"] == "VALIDATION_ERROR"
        assert body["message"] == "Missing required field: category"
        assert body["requestId"] == "test-123"

    def test_unauthorized_error(self):
        resp = error_response(ErrorCode.UNAUTHORIZED, "Token expired")
        assert resp["statusCode"] == 401

    def test_forbidden_error(self):
        resp = error_response(ErrorCode.FORBIDDEN, "Insufficient trust")
        assert resp["statusCode"] == 403

    def test_not_found_error(self):
        resp = error_response(ErrorCode.NOT_FOUND, "Item not found")
        assert resp["statusCode"] == 404

    def test_insufficient_points_error(self):
        resp = error_response(ErrorCode.INSUFFICIENT_POINTS, "Not enough points")
        assert resp["statusCode"] == 400

    def test_service_unavailable_error(self):
        resp = error_response(ErrorCode.SERVICE_UNAVAILABLE, "ElevenLabs down")
        assert resp["statusCode"] == 503

    def test_internal_error(self):
        resp = error_response(ErrorCode.INTERNAL_ERROR, "Unexpected failure")
        assert resp["statusCode"] == 500

    def test_auto_generates_request_id(self):
        resp = error_response(ErrorCode.INTERNAL_ERROR, "fail")
        body = json.loads(resp["body"])
        # Should be a valid UUID
        uuid.UUID(body["requestId"])

    def test_body_is_json_string(self):
        resp = error_response(ErrorCode.NOT_FOUND, "gone")
        assert isinstance(resp["body"], str)


# ── sanitize.py ──────────────────────────────────────────────────────────


class TestSanitizePii:
    def test_redacts_email(self):
        result = sanitize_pii({"email": "user@example.com", "id": "123"})
        assert result["email"] == "[REDACTED]"
        assert result["id"] == "123"

    def test_redacts_phone(self):
        result = sanitize_pii({"phone": "+1234567890"})
        assert result["phone"] == "[REDACTED]"

    def test_redacts_phone_number(self):
        result = sanitize_pii({"phone_number": "+1234567890"})
        assert result["phone_number"] == "[REDACTED]"

    def test_redacts_address(self):
        result = sanitize_pii({"address": "123 Main St"})
        assert result["address"] == "[REDACTED]"

    def test_redacts_full_name(self):
        result = sanitize_pii({"full_name": "Jane Doe"})
        assert result["full_name"] == "[REDACTED]"

    def test_redacts_name(self):
        result = sanitize_pii({"name": "Jane Doe"})
        assert result["name"] == "[REDACTED]"

    def test_case_insensitive_keys(self):
        result = sanitize_pii({"Email": "a@b.com", "PHONE": "555"})
        assert result["Email"] == "[REDACTED]"
        assert result["PHONE"] == "[REDACTED]"

    def test_nested_dict(self):
        data = {"user": {"email": "a@b.com", "id": "u1"}}
        result = sanitize_pii(data)
        assert result["user"]["email"] == "[REDACTED]"
        assert result["user"]["id"] == "u1"

    def test_list_of_dicts(self):
        data = {"users": [{"email": "a@b.com"}, {"email": "c@d.com"}]}
        result = sanitize_pii(data)
        assert all(u["email"] == "[REDACTED]" for u in result["users"])

    def test_does_not_mutate_original(self):
        original = {"email": "a@b.com"}
        sanitize_pii(original)
        assert original["email"] == "a@b.com"

    def test_empty_dict(self):
        assert sanitize_pii({}) == {}

    def test_no_pii_fields(self):
        data = {"item_id": "abc", "status": "active"}
        assert sanitize_pii(data) == data
