from __future__ import annotations

from server.modules.common import extract_first_http_url, is_absolute_http_url, safe_date, to_boolean_or_null


def test_to_boolean_or_null_handles_known_values() -> None:
    assert to_boolean_or_null("tak") is True
    assert to_boolean_or_null("not-applied") is False
    assert to_boolean_or_null("unknown") is None


def test_safe_date_parses_iso_and_excel_serial() -> None:
    assert safe_date("2026-04-17") == "2026-04-17"
    assert safe_date("not-a-date") is None


def test_url_helpers() -> None:
    assert is_absolute_http_url("https://example.com/path") is True
    assert is_absolute_http_url("/relative/path") is False
    assert extract_first_http_url("Oferta: https://example.com/job, pilne!") == "https://example.com/job"
