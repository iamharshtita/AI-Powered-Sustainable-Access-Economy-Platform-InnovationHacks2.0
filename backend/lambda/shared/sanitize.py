"""PII sanitisation utilities.

Strips personally identifiable information from dictionaries before they
are logged or returned in error responses.  Redacted fields are replaced
with the string ``"[REDACTED]"``.

PII fields: email, phone, address, full_name (and common variants).
"""

from __future__ import annotations

import copy
from typing import Any

# Field names (lowercased) that are considered PII.
_PII_FIELDS: frozenset[str] = frozenset({
    "email",
    "phone",
    "phone_number",
    "address",
    "full_name",
    "fullname",
    "name",
})

_REDACTED = "[REDACTED]"


def sanitize_pii(data: dict[str, Any]) -> dict[str, Any]:
    """Return a deep copy of *data* with PII field values replaced.

    Only top-level and nested dict values are inspected.  Lists of dicts
    are also handled recursively.

    Args:
        data: Arbitrary dictionary that may contain PII.

    Returns:
        A new dictionary with PII values replaced by ``"[REDACTED]"``.
    """
    return _redact(copy.deepcopy(data))


def _redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {
            k: _REDACTED if k.lower() in _PII_FIELDS else _redact(v)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact(item) for item in obj]
    return obj
