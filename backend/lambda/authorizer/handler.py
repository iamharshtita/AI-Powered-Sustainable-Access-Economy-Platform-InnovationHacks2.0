"""Auth0 JWT Authorizer Lambda.

Validates JWT tokens issued by Auth0 using JWKS (RS256).
Extracts user identity and passes it to downstream Lambdas
via the API Gateway authorizer context.
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.request
import urllib.error
from typing import Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE", "")
AUTH0_ISSUER = f"https://{AUTH0_DOMAIN}/" if AUTH0_DOMAIN else ""

# JWKS cache (per Lambda cold-start)
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """API Gateway Token Authorizer handler.

    Validates the Bearer token from the Authorization header,
    verifies signature using Auth0 JWKS, checks issuer/audience/expiry,
    and returns an IAM policy allowing or denying the request.
    """
    token = event.get("authorizationToken", "")
    method_arn = event.get("methodArn", "*")

    if not token:
        logger.warning("No authorization token provided")
        raise Exception("Unauthorized")

    # Strip "Bearer " prefix
    if token.lower().startswith("bearer "):
        token = token[7:]

    try:
        payload = _verify_jwt(token)
        principal_id = payload.get("sub", "unknown")

        return _generate_policy(
            principal_id,
            "Allow",
            method_arn,
            context={
                "user_id": principal_id,
                "scope": payload.get("scope", ""),
                "email": payload.get("email", ""),
            },
        )
    except Exception as e:
        logger.warning("JWT validation failed: %s", str(e))
        raise Exception("Unauthorized")


def _verify_jwt(token: str) -> dict[str, Any]:
    """Verify a JWT token using Auth0 JWKS.

    Performs RS256 signature verification, issuer/audience/expiry checks.
    Uses pure Python implementation (no external JWT libraries needed).
    """
    # Decode header to get kid
    header = _decode_jwt_part(token.split(".")[0])
    kid = header.get("kid")
    alg = header.get("alg")

    if alg != "RS256":
        raise ValueError(f"Unsupported algorithm: {alg}")

    if not kid:
        raise ValueError("No kid in JWT header")

    # Get the signing key from JWKS
    jwks = _get_jwks()
    key = _find_key(jwks, kid)
    if not key:
        # Refresh JWKS cache and retry (key rotation)
        jwks = _get_jwks(force_refresh=True)
        key = _find_key(jwks, kid)
        if not key:
            raise ValueError(f"No matching key found for kid: {kid}")

    # Verify signature using the public key
    _verify_rs256_signature(token, key)

    # Decode and validate payload
    payload = _decode_jwt_part(token.split(".")[1])

    # Validate issuer
    if payload.get("iss") != AUTH0_ISSUER:
        raise ValueError(f"Invalid issuer: {payload.get('iss')}")

    # Validate audience
    aud = payload.get("aud")
    if isinstance(aud, list):
        if AUTH0_AUDIENCE not in aud:
            raise ValueError(f"Invalid audience: {aud}")
    elif aud != AUTH0_AUDIENCE:
        raise ValueError(f"Invalid audience: {aud}")

    # Validate expiry
    exp = payload.get("exp", 0)
    if time.time() > exp:
        raise ValueError("Token expired")

    # Validate not-before
    nbf = payload.get("nbf")
    if nbf and time.time() < nbf:
        raise ValueError("Token not yet valid")

    return payload


def _get_jwks(force_refresh: bool = False) -> dict[str, Any]:
    """Fetch JWKS from Auth0, with caching."""
    global _jwks_cache, _jwks_cache_time

    if not force_refresh and _jwks_cache and (time.time() - _jwks_cache_time < JWKS_CACHE_TTL):
        return _jwks_cache

    jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    try:
        req = urllib.request.Request(jwks_url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            _jwks_cache = json.loads(resp.read().decode("utf-8"))
            _jwks_cache_time = time.time()
            return _jwks_cache
    except Exception:
        logger.exception("Failed to fetch JWKS from %s", jwks_url)
        if _jwks_cache:
            return _jwks_cache
        raise ValueError("Cannot fetch JWKS and no cache available")


def _find_key(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
    """Find a key in the JWKS by kid."""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def _verify_rs256_signature(token: str, jwk: dict[str, Any]) -> None:
    """Verify RS256 signature of a JWT using the JWK public key.

    Uses Python's built-in rsa module for signature verification.
    """
    import base64
    import hashlib
    import struct

    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")

    # The signed content is header.payload
    signed_content = f"{parts[0]}.{parts[1]}".encode("ascii")
    signature = _base64url_decode(parts[2])

    # Extract RSA public key components from JWK
    n = _base64url_decode(jwk["n"])
    e = _base64url_decode(jwk["e"])

    # Convert to integers
    n_int = int.from_bytes(n, "big")
    e_int = int.from_bytes(e, "big")

    # Verify PKCS#1 v1.5 signature
    sig_int = int.from_bytes(signature, "big")
    decrypted = pow(sig_int, e_int, n_int)

    # Convert back to bytes
    key_size = (n_int.bit_length() + 7) // 8
    decrypted_bytes = decrypted.to_bytes(key_size, "big")

    # PKCS#1 v1.5 padding: 0x00 0x01 [padding 0xFF bytes] 0x00 [DigestInfo]
    # DigestInfo for SHA-256: 30 31 30 0d 06 09 60 86 48 01 65 03 04 02 01 05 00 04 20 [hash]
    sha256_digest_info_prefix = bytes([
        0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86,
        0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05,
        0x00, 0x04, 0x20,
    ])

    # Compute expected hash
    expected_hash = hashlib.sha256(signed_content).digest()
    expected_suffix = sha256_digest_info_prefix + expected_hash

    # Verify padding structure
    if decrypted_bytes[0] != 0x00 or decrypted_bytes[1] != 0x01:
        raise ValueError("Invalid PKCS#1 v1.5 signature padding")

    # Find the 0x00 separator after padding
    separator_idx = decrypted_bytes.index(0x00, 2)
    digest_info = decrypted_bytes[separator_idx + 1:]

    if digest_info != expected_suffix:
        raise ValueError("JWT signature verification failed")


def _decode_jwt_part(part: str) -> dict[str, Any]:
    """Decode a base64url-encoded JWT part (header or payload)."""
    data = _base64url_decode(part)
    return json.loads(data.decode("utf-8"))


def _base64url_decode(s: str) -> bytes:
    """Decode a base64url string."""
    import base64

    # Add padding if needed
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)


def _generate_policy(
    principal_id: str,
    effect: str,
    method_arn: str,
    context: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Generate an IAM policy document for API Gateway."""
    # Use a wildcard ARN so the cached policy works across all methods
    arn_parts = method_arn.split(":")
    api_gateway_arn = ":".join(arn_parts[:5])
    rest_parts = arn_parts[5].split("/")
    resource_arn = f"{api_gateway_arn}:{rest_parts[0]}/{rest_parts[1]}/*"

    policy: dict[str, Any] = {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource_arn,
                }
            ],
        },
    }

    if context:
        policy["context"] = context

    return policy
