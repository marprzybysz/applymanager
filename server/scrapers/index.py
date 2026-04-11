from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from .http import fetch_html
from .parsers import clean_text, parse_job_from_meta, parse_jobs_from_json_ld
from .providers import get_provider, get_supported_sources, parse_with_optional_json_ld

UNKNOWN_SOURCE = "unknown"
DIRECT_SCRAPE_HOST_MATCHERS = [
    ("pracuj.pl", "pracuj"),
    ("olx.pl", "olx"),
    ("nofluffjobs.com", "nofluffjobs"),
    ("rocketjobs.pl", "rocketjobs"),
    ("indeed.", "indeed"),
    ("justjoin.it", "justjoinit"),
]


def normalize_text(value: Any) -> str | None:
    return clean_text(value)


def normalize_date_only(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None

    if len(text) >= 10 and text[4:5] == "-" and text[7:8] == "-":
        return text[:10]

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    except Exception:
        return None


def add_days(date_string: str, days: int) -> str | None:
    try:
        current = datetime.strptime(date_string, "%Y-%m-%d").date()
    except Exception:
        return None
    return (current + timedelta(days=days)).isoformat()


def get_today_date_only() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def diff_days(end_date: str, start_date: str) -> int | None:
    try:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
    except Exception:
        return None
    return (end - start).days


def get_recruitment_status(days_to_expire: int | None) -> dict[str, str] | None:
    if days_to_expire is None:
        return None
    if days_to_expire < 0:
        return {"code": "expired", "label": "Wygaslo", "badgeColor": "black", "textColor": "yellow"}
    if days_to_expire < 10:
        return {"code": "red", "label": "Niezalecane", "badgeColor": "red", "textColor": "white"}
    if days_to_expire < 20:
        return {"code": "yellow", "label": "Koncowka rekrutacji", "badgeColor": "yellow", "textColor": "black"}
    return {"code": "green", "label": "Swieza oferta", "badgeColor": "green", "textColor": "white"}


def with_recruitment_window(job: dict[str, Any]) -> dict[str, Any]:
    date_posted = normalize_date_only(job.get("datePosted"))
    explicit_expires_at = normalize_date_only(job.get("expiresAt"))
    expires_at = explicit_expires_at or (add_days(date_posted, 30) if date_posted else None)
    days_to_expire = diff_days(expires_at, get_today_date_only()) if expires_at else None

    enriched = {**job}
    enriched["datePosted"] = date_posted
    enriched["expiresAt"] = expires_at
    enriched["daysToExpire"] = days_to_expire
    enriched["recruitmentStatus"] = get_recruitment_status(days_to_expire)
    return enriched


def clamp_limit(limit_per_source: int | float | str | None) -> int:
    try:
        value = int(float(limit_per_source if limit_per_source is not None else 20))
    except Exception:
        value = 20
    return max(1, min(value, 50))


def normalize_job(job: dict[str, Any], source: str) -> dict[str, Any]:
    normalized = {
        "source": source,
        "title": normalize_text(job.get("title")),
        "company": normalize_text(job.get("company")),
        "location": normalize_text(job.get("location")),
        "url": normalize_text(job.get("url")),
        "datePosted": normalize_date_only(job.get("datePosted")),
        "expiresAt": normalize_date_only(job.get("validThrough") or job.get("expiresAt")),
        "salary": job.get("salary"),
        "employmentTypes": job.get("employmentTypes") if isinstance(job.get("employmentTypes"), list) else [],
        "workTime": normalize_text(job.get("workTime")),
        "workMode": normalize_text(job.get("workMode")),
        "shiftCount": normalize_text(job.get("shiftCount")),
        "workingHours": normalize_text(job.get("workingHours")),
        "raw": job.get("raw"),
    }
    return with_recruitment_window(normalized)


def scrape_source(source: str, query: str, limit_per_source: int) -> dict[str, Any]:
    provider = get_provider(source)
    if not provider:
        return {"source": source, "ok": False, "jobs": [], "error": f"Unsupported source: {source}"}

    try:
        url = provider.search_url(query)
        html = fetch_html(url)
        jobs = [normalize_job(job, source) for job in parse_with_optional_json_ld(html, provider, limit_per_source)]
        return {
            "source": source,
            "ok": True,
            "jobs": jobs,
            "fetchedFrom": url,
            "count": len(jobs),
        }
    except Exception as error:
        return {
            "source": source,
            "ok": False,
            "jobs": [],
            "error": str(error),
        }


def scrape_jobs(query: str, sources: list[str] | None = None, limit_per_source: int = 20) -> dict[str, Any]:
    requested_sources = [s.strip().lower() for s in (sources if sources else get_supported_sources()) if s and s.strip()]
    safe_limit = clamp_limit(limit_per_source)

    settled = [scrape_source(source, query, safe_limit) for source in requested_sources]
    jobs: list[dict[str, Any]] = []
    for entry in settled:
        jobs.extend(entry.get("jobs", []))

    return {
        "query": query,
        "total": len(jobs),
        "sources": settled,
        "jobs": jobs,
    }


def detect_source_from_host(hostname: str) -> str:
    host = hostname.lower()
    for matcher, source in DIRECT_SCRAPE_HOST_MATCHERS:
        if matcher in host:
            return source
    return UNKNOWN_SOURCE


def scrape_job_from_link(url_input: str) -> dict[str, Any]:
    parsed_url = urlparse(url_input)
    hostname = (parsed_url.hostname or "").lower()
    source = detect_source_from_host(parsed_url.hostname or "")
    if source == UNKNOWN_SOURCE:
        raise RuntimeError("Unsupported domain for direct link scraping")

    if source == "pracuj" and "pracodawcy.pracuj.pl" in hostname:
        raise RuntimeError("To jest link do profilu pracodawcy. Wklej link do konkretnej oferty z pracuj.pl/praca/...oferta,...")

    html = fetch_html(url_input)
    from_json_ld = parse_jobs_from_json_ld(html, source)
    from_meta = parse_job_from_meta(html, source, url_input)

    from_json_ld_first = next((job for job in from_json_ld if job.get("title") or job.get("company") or job.get("url")), None)
    if not from_json_ld_first and not from_meta:
        raise RuntimeError("Could not parse job data from this URL")

    merged: dict[str, Any] = {}
    if from_meta:
        merged.update(from_meta)
    if from_json_ld_first:
        merged.update(from_json_ld_first)

    merged["url"] = normalize_text((from_json_ld_first or {}).get("url")) or normalize_text((from_meta or {}).get("url")) or url_input
    merged["company"] = normalize_text((from_json_ld_first or {}).get("company")) or normalize_text((from_meta or {}).get("company"))
    merged["title"] = normalize_text((from_json_ld_first or {}).get("title")) or normalize_text((from_meta or {}).get("title"))
    merged["location"] = normalize_text((from_json_ld_first or {}).get("location")) or normalize_text((from_meta or {}).get("location"))
    merged["datePosted"] = normalize_date_only((from_json_ld_first or {}).get("datePosted")) or normalize_date_only((from_meta or {}).get("datePosted"))
    merged["expiresAt"] = normalize_date_only((from_json_ld_first or {}).get("validThrough")) or normalize_date_only((from_meta or {}).get("validThrough"))
    merged["salary"] = (from_json_ld_first or {}).get("salary") or (from_meta or {}).get("salary")
    merged["employmentTypes"] = (from_json_ld_first or {}).get("employmentTypes") or (from_meta or {}).get("employmentTypes") or []
    merged["workTime"] = (from_json_ld_first or {}).get("workTime") or (from_meta or {}).get("workTime")
    merged["workMode"] = (from_json_ld_first or {}).get("workMode") or (from_meta or {}).get("workMode")
    merged["shiftCount"] = (from_json_ld_first or {}).get("shiftCount") or (from_meta or {}).get("shiftCount")
    merged["workingHours"] = (from_json_ld_first or {}).get("workingHours") or (from_meta or {}).get("workingHours")
    merged["raw"] = (from_json_ld_first or {}).get("raw") or (from_meta or {}).get("raw")

    return with_recruitment_window(
        {
            "source": source,
            "title": normalize_text(merged.get("title")),
            "company": normalize_text(merged.get("company")),
            "location": normalize_text(merged.get("location")),
            "url": normalize_text(merged.get("url")) or url_input,
            "datePosted": normalize_date_only(merged.get("datePosted")),
            "expiresAt": normalize_date_only(merged.get("expiresAt")),
            "salary": merged.get("salary"),
            "employmentTypes": merged.get("employmentTypes"),
            "workTime": normalize_text(merged.get("workTime")),
            "workMode": normalize_text(merged.get("workMode")),
            "shiftCount": normalize_text(merged.get("shiftCount")),
            "workingHours": normalize_text(merged.get("workingHours")),
            "raw": merged.get("raw"),
        }
    )


__all__ = ["get_supported_sources", "scrape_job_from_link", "scrape_jobs"]
