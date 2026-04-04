"""Unit tests for the Voice Service handler."""

import base64
import hashlib
import json
import os
import sys
from io import BytesIO
from unittest.mock import MagicMock, patch, ANY

import pytest

# Make the lambda packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "lambda"))

# Must set env vars before importing the handler
os.environ.setdefault("AUDIO_BUCKET", "test-audio-bucket")
os.environ.setdefault("ELEVENLABS_SECRET_ARN", "arn:aws:secretsmanager:us-east-1:123456789:secret:test")

import voice_service.handler as voice_handler_module
from voice_service.handler import (
    handler,
    text_to_speech,
    transcribe_audio,
)


@pytest.fixture(autouse=True)
def _reset_api_key_cache():
    """Reset the module-level API key cache between tests."""
    voice_handler_module._api_key_cache = None
    yield
    voice_handler_module._api_key_cache = None


# ── Helpers ──────────────────────────────────────────────────────────────


def _api_event(
    method: str,
    resource: str,
    body: dict | None = None,
) -> dict:
    """Build a minimal API Gateway proxy event."""
    return {
        "httpMethod": method,
        "resource": resource,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": None,
        "pathParameters": None,
        "requestContext": {"authorizer": {}},
    }


def _mock_s3_client(cached_data: bytes | None = None):
    """Return a mock S3 client. If cached_data is provided, get_object returns it."""
    client = MagicMock()
    if cached_data is not None:
        body_mock = MagicMock()
        body_mock.read.return_value = cached_data
        client.get_object.return_value = {"Body": body_mock}
    else:
        client.get_object.side_effect = Exception("NoSuchKey")
    client.put_object.return_value = {}
    return client


def _mock_secrets_client(api_key: str = "test-api-key"):
    """Return a mock Secrets Manager client."""
    client = MagicMock()
    client.get_secret_value.return_value = {
        "SecretString": json.dumps({"api_key": api_key}),
    }
    return client


# ── Router Tests ─────────────────────────────────────────────────────────


class TestRouter:
    @patch("voice_service.handler.boto3")
    def test_unknown_route_returns_404(self, mock_boto3):
        event = _api_event("GET", "/api/unknown")
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    @patch("voice_service.handler.boto3")
    def test_tts_route_dispatches(self, mock_boto3):
        mock_boto3.client.return_value = _mock_secrets_client()
        event = _api_event("POST", "/api/voice/tts", {"text": "hello"})
        # Will fail at ElevenLabs call but should not 404
        with patch("voice_service.handler._get_cached_audio", return_value=None), \
             patch("voice_service.handler._call_elevenlabs_tts", return_value=b"audio"):
            resp = handler(event, None)
        assert resp["statusCode"] == 200

    @patch("voice_service.handler.boto3")
    def test_transcribe_route_dispatches(self, mock_boto3):
        mock_boto3.client.return_value = _mock_secrets_client()
        audio_b64 = base64.b64encode(b"fake audio").decode()
        event = _api_event("POST", "/api/voice/transcribe", {"audio": audio_b64})
        with patch("voice_service.handler._call_elevenlabs_stt", return_value="hello world"):
            resp = handler(event, None)
        assert resp["statusCode"] == 200


# ── TTS Tests ────────────────────────────────────────────────────────────


class TestTextToSpeech:
    @patch("voice_service.handler._cache_audio")
    @patch("voice_service.handler._call_elevenlabs_tts", return_value=b"audio-bytes")
    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_tts_calls_elevenlabs_and_returns_audio(
        self, mock_key, mock_cache_get, mock_tts, mock_cache_put
    ):
        resp = text_to_speech("Hello world")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["audio"] == base64.b64encode(b"audio-bytes").decode()
        assert body["cached"] is False
        mock_tts.assert_called_once()
        mock_cache_put.assert_called_once()

    @patch("voice_service.handler._get_cached_audio")
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_tts_returns_cached_audio(self, mock_key, mock_cache_get):
        cached = b"cached-audio"
        mock_cache_get.return_value = cached
        resp = text_to_speech("Hello world")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["audio"] == base64.b64encode(cached).decode()
        assert body["cached"] is True

    def test_tts_empty_text_returns_400(self):
        resp = text_to_speech("")
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["error"] == "VALIDATION_ERROR"

    def test_tts_whitespace_text_returns_400(self):
        resp = text_to_speech("   ")
        assert resp["statusCode"] == 400

    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value=None)
    def test_tts_no_api_key_returns_503(self, mock_key, mock_cache):
        resp = text_to_speech("Hello")
        assert resp["statusCode"] == 503
        body = json.loads(resp["body"])
        assert body["error"] == "SERVICE_UNAVAILABLE"

    @patch("voice_service.handler._call_elevenlabs_tts", return_value=None)
    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_tts_elevenlabs_failure_returns_503(self, mock_key, mock_cache, mock_tts):
        resp = text_to_speech("Hello")
        assert resp["statusCode"] == 503

    @patch("voice_service.handler._cache_audio")
    @patch("voice_service.handler._call_elevenlabs_tts", return_value=b"audio")
    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_tts_content_hash_is_sha256(self, mock_key, mock_cache_get, mock_tts, mock_cache_put):
        text = "Test content"
        resp = text_to_speech(text)
        body = json.loads(resp["body"])
        expected_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        assert body["content_hash"] == expected_hash

    @patch("voice_service.handler._cache_audio")
    @patch("voice_service.handler._call_elevenlabs_tts", return_value=b"audio")
    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_tts_uses_custom_voice_id(self, mock_key, mock_cache_get, mock_tts, mock_cache_put):
        text_to_speech("Hello", voice_id="custom-voice")
        mock_tts.assert_called_once_with("test-key", "Hello", "custom-voice")


# ── Transcription Tests ──────────────────────────────────────────────────


class TestTranscribeAudio:
    @patch("voice_service.handler._call_elevenlabs_stt", return_value="hello world")
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_transcribe_returns_text(self, mock_key, mock_stt):
        resp = transcribe_audio(b"fake audio data")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["text"] == "hello world"

    def test_transcribe_empty_audio_returns_400(self):
        resp = transcribe_audio(b"")
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["error"] == "VALIDATION_ERROR"

    @patch("voice_service.handler._get_elevenlabs_api_key", return_value=None)
    def test_transcribe_no_api_key_returns_503(self, mock_key):
        resp = transcribe_audio(b"audio")
        assert resp["statusCode"] == 503

    @patch("voice_service.handler._call_elevenlabs_stt", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_transcribe_elevenlabs_failure_returns_503(self, mock_key, mock_stt):
        resp = transcribe_audio(b"audio")
        assert resp["statusCode"] == 503


# ── API Gateway Handler Tests ────────────────────────────────────────────


class TestHandleTts:
    @patch("voice_service.handler._cache_audio")
    @patch("voice_service.handler._call_elevenlabs_tts", return_value=b"audio")
    @patch("voice_service.handler._get_cached_audio", return_value=None)
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_handle_tts_valid_request(self, mock_key, mock_cache, mock_tts, mock_put):
        event = _api_event("POST", "/api/voice/tts", {"text": "Hello"})
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    def test_handle_tts_missing_body_returns_400(self):
        event = _api_event("POST", "/api/voice/tts")
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_handle_tts_empty_text_returns_400(self):
        event = _api_event("POST", "/api/voice/tts", {"text": ""})
        resp = handler(event, None)
        assert resp["statusCode"] == 400


class TestHandleTranscribe:
    @patch("voice_service.handler._call_elevenlabs_stt", return_value="transcribed")
    @patch("voice_service.handler._get_elevenlabs_api_key", return_value="test-key")
    def test_handle_transcribe_valid_request(self, mock_key, mock_stt):
        audio_b64 = base64.b64encode(b"audio data").decode()
        event = _api_event("POST", "/api/voice/transcribe", {"audio": audio_b64})
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["text"] == "transcribed"

    def test_handle_transcribe_missing_body_returns_400(self):
        event = _api_event("POST", "/api/voice/transcribe")
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_handle_transcribe_missing_audio_returns_400(self):
        event = _api_event("POST", "/api/voice/transcribe", {"other": "data"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_handle_transcribe_invalid_base64_returns_400(self):
        event = _api_event("POST", "/api/voice/transcribe", {"audio": "not-valid-b64!!!"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400
