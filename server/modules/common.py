from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any
from urllib.parse import urlparse

from openpyxl.utils.datetime import from_excel


def to_non_empty_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def to_boolean_or_null(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if int(value) == 1:
            return True
        if int(value) == 0:
            return False
        return None

    normalized = str(value).strip().lower()
    if not normalized:
        return None
    if normalized in {"true", "1", "yes", "y", "tak", "t", "applied"}:
        return True
    if normalized in {"false", "0", "no", "n", "nie", "f", "not_applied", "not-applied"}:
        return False
    return None


def safe_date(value: Any) -> str | None:
    if value in (None, ""):
        return None

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, (int, float)):
        try:
            parsed = from_excel(value)
            if isinstance(parsed, datetime):
                return parsed.date().isoformat()
            if isinstance(parsed, date):
                return parsed.isoformat()
        except Exception:
            pass

    text = str(value).strip()
    if not text:
        return None

    if text.isdigit():
        try:
            parsed = from_excel(float(text))
            if isinstance(parsed, datetime):
                return parsed.date().isoformat()
            if isinstance(parsed, date):
                return parsed.isoformat()
        except Exception:
            pass

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    except Exception:
        return None


def is_absolute_http_url(value: Any) -> bool:
    try:
        parsed = urlparse(str(value))
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def extract_first_http_url(input_text: Any) -> str | None:
    text = to_non_empty_string(input_text)
    if not text:
        return None

    match = re.search(r"https?://[^\s\"'<>]+", text, flags=re.IGNORECASE)
    if not match:
        return None

    return re.sub(r"[),.;!?]+$", "", match.group(0))
