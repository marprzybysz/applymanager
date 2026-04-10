from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from server.modules.common import extract_first_http_url, is_absolute_http_url, to_non_empty_string
from server.scrapers.index import get_supported_sources, scrape_job_from_link, scrape_jobs


def normalize_scrape_url(input_text: Any) -> str | None:
    candidate = extract_first_http_url(input_text) or to_non_empty_string(input_text)
    if not candidate or not is_absolute_http_url(candidate):
        return None

    parsed = urlparse(candidate)
    host = (parsed.hostname or "").lower()

    if "pracuj.pl" in host:
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    return candidate


def scrape_query_or_link(query: str, sources: list[str] | None, limit_per_source: int) -> dict[str, Any]:
    normalized_query_url = normalize_scrape_url(query)
    if normalized_query_url:
        job = scrape_job_from_link(normalized_query_url)
        return {
            "ok": True,
            "mode": "link",
            "query": normalized_query_url,
            "total": 1,
            "sources": [{"source": job.get("source"), "ok": True, "jobs": [job], "fetchedFrom": normalized_query_url, "count": 1}],
            "jobs": [job],
        }

    result = scrape_jobs(query=query, sources=sources, limit_per_source=limit_per_source)
    return {"ok": True, "mode": "search", **result}


def scrape_single_url(url: str) -> dict[str, Any]:
    parsed = scrape_job_from_link(url)
    return {"ok": True, "job": parsed}


def list_sources() -> dict[str, Any]:
    return {"sources": get_supported_sources()}
