"""Voice Service Lambda handler.

Endpoints:
- POST /api/voice/tts        — Convert text to speech audio (ElevenLabs)
- POST /api/voice/transcribe  — Transcribe audio to text (ElevenLabs/Whisper)
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import urllib.request
import urllib.error
from typing import Any

import boto3

from shared.response import success_response, error_response, ErrorCode

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET", "")
ELEVENLABS_SECRET_ARN = os.environ.get("ELEVENLABS_SECRET_ARN", "")

# Cached API key (per Lambda cold-start)
_api_key_cache: str | None = None

DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # ElevenLabs default voice
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Route incoming API Gateway events to the appropriate handler."""
    http_method = event.get("httpMethod", "")
    resource = event.get("resource", "")

    try:
        if resource == "/api/voice/tts" and http_method == "POST":
            return _handle_tts(event)
        elif resource == "/api/voice/transcribe" and http_method == "POST":
            return _handle_transcribe(event)
        else:
            return error_response(
                ErrorCode.NOT_FOUND, f"Route not found: {http_method} {resource}"
            )
    except Exception:
        logger.exception("Unhandled error in voice_service handler")
        return error_response(ErrorCode.INTERNAL_ERROR, "Internal server error")


# ── Text-to-Speech ───────────────────────────────────────────────────────


def text_to_speech(text: str, voice_id: str | None = None) -> dict[str, Any]:
    """Convert text to audio using ElevenLabs TTS.

    Caches audio in S3 by SHA-256 content hash. Returns base64-encoded audio.

    Args:
        text: The text to synthesise.
        voice_id: Optional ElevenLabs voice ID.

    Returns:
        Success response with base64 audio, or error response.
    """
    if not text or not text.strip():
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: text")

    content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    s3_key = f"tts-cache/{content_hash}.mp3"

    # Check S3 cache first
    cached_audio = _get_cached_audio(s3_key)
    if cached_audio is not None:
        return success_response({
            "audio": base64.b64encode(cached_audio).decode("utf-8"),
            "cached": True,
            "content_hash": content_hash,
        })

    # Call ElevenLabs API
    api_key = _get_elevenlabs_api_key()
    if not api_key:
        return error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Voice service is temporarily unavailable. Please try again later.",
        )

    vid = voice_id or DEFAULT_VOICE_ID
    audio_bytes = _call_elevenlabs_tts(api_key, text, vid)
    if audio_bytes is None:
        return error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Voice service is temporarily unavailable. Please try again later.",
        )

    # Cache in S3
    _cache_audio(s3_key, audio_bytes)

    return success_response({
        "audio": base64.b64encode(audio_bytes).decode("utf-8"),
        "cached": False,
        "content_hash": content_hash,
    })


def _handle_tts(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/voice/tts."""
    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    text = body.get("text", "")
    voice_id = body.get("voice_id")
    return text_to_speech(text, voice_id)


# ── Transcription ────────────────────────────────────────────────────────


def transcribe_audio(audio_data: bytes) -> dict[str, Any]:
    """Transcribe audio to text using ElevenLabs speech-to-text.

    Args:
        audio_data: Raw audio bytes.

    Returns:
        Success response with transcribed text, or error response.
    """
    if not audio_data:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: audio")

    api_key = _get_elevenlabs_api_key()
    if not api_key:
        return error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Voice service is temporarily unavailable. Please try again later.",
        )

    transcribed_text = _call_elevenlabs_stt(api_key, audio_data)
    if transcribed_text is None:
        return error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Voice service is temporarily unavailable. Please try again later.",
        )

    return success_response({"text": transcribed_text})


def _handle_transcribe(event: dict[str, Any]) -> dict[str, Any]:
    """API Gateway handler for POST /api/voice/transcribe."""
    body = _parse_body(event)
    if body is None:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid or missing request body")

    audio_b64 = body.get("audio")
    if not audio_b64:
        return error_response(ErrorCode.VALIDATION_ERROR, "Missing required field: audio")

    try:
        audio_data = base64.b64decode(audio_b64)
    except Exception:
        return error_response(ErrorCode.VALIDATION_ERROR, "Invalid base64 audio data")

    return transcribe_audio(audio_data)


# ── ElevenLabs API Helpers ───────────────────────────────────────────────


def _get_elevenlabs_api_key() -> str | None:
    """Retrieve the ElevenLabs API key from Secrets Manager.

    Caches the key for the lifetime of the Lambda execution environment.
    Returns None if the secret cannot be read.
    """
    global _api_key_cache
    if _api_key_cache is not None:
        return _api_key_cache

    if not ELEVENLABS_SECRET_ARN:
        logger.error("ELEVENLABS_SECRET_ARN not configured")
        return None

    try:
        client = boto3.client("secretsmanager")
        response = client.get_secret_value(SecretId=ELEVENLABS_SECRET_ARN)
        secret = json.loads(response["SecretString"])
        _api_key_cache = secret.get("api_key")
        return _api_key_cache
    except Exception:
        logger.exception("Failed to retrieve ElevenLabs API key from Secrets Manager")
        return None


def _call_elevenlabs_tts(api_key: str, text: str, voice_id: str) -> bytes | None:
    """Call ElevenLabs TTS API. Returns audio bytes or None on failure."""
    url = f"{ELEVENLABS_TTS_URL}/{voice_id}"
    payload = json.dumps({
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "xi-api-key": api_key,
            "Accept": "audio/mpeg",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read()
    except (urllib.error.URLError, urllib.error.HTTPError):
        logger.exception("ElevenLabs TTS API call failed")
        return None


def _call_elevenlabs_stt(api_key: str, audio_data: bytes) -> str | None:
    """Call ElevenLabs speech-to-text API. Returns transcribed text or None."""
    # Build multipart/form-data request
    boundary = "----VoiceServiceBoundary"
    body_parts = [
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n",
    ]
    body = (
        body_parts[0].encode("utf-8")
        + audio_data
        + f"\r\n--{boundary}--\r\n".encode("utf-8")
    )

    req = urllib.request.Request(
        ELEVENLABS_STT_URL,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "xi-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("text", "")
    except (urllib.error.URLError, urllib.error.HTTPError):
        logger.exception("ElevenLabs STT API call failed")
        return None


# ── S3 Cache Helpers ─────────────────────────────────────────────────────


def _get_cached_audio(s3_key: str) -> bytes | None:
    """Try to retrieve cached audio from S3. Returns bytes or None."""
    if not AUDIO_BUCKET:
        return None

    try:
        s3 = boto3.client("s3")
        response = s3.get_object(Bucket=AUDIO_BUCKET, Key=s3_key)
        return response["Body"].read()
    except Exception:
        logger.debug("S3 cache miss for key %s", s3_key)
        return None


def _cache_audio(s3_key: str, audio_bytes: bytes) -> None:
    """Store audio bytes in S3 cache."""
    if not AUDIO_BUCKET:
        return

    try:
        s3 = boto3.client("s3")
        s3.put_object(
            Bucket=AUDIO_BUCKET,
            Key=s3_key,
            Body=audio_bytes,
            ContentType="audio/mpeg",
        )
    except Exception:
        logger.exception("Failed to cache audio in S3 for key %s", s3_key)


# ── Helpers ──────────────────────────────────────────────────────────────


def _parse_body(event: dict[str, Any]) -> dict[str, Any] | None:
    """Parse JSON body from API Gateway event."""
    body = event.get("body")
    if not body:
        return None
    if isinstance(body, str):
        try:
            return json.loads(body)
        except (json.JSONDecodeError, TypeError):
            return None
    return body
