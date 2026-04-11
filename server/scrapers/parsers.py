from __future__ import annotations

import json
import re
from typing import Any

from bs4 import BeautifulSoup

JSON_LD_SELECTOR = "script[type='application/ld+json']"
JOB_POSTING_TYPE = "JobPosting"

PRACUJ_CONTRACT_VARIANTS: dict[str, list[str]] = {
    "umowa o pracę": [
        "umowa o prace",
        "umowe o prace",
        "uop",
        "umowaoprace",
    ],
    "umowa b2b": [
        "umowa b2b",
        "b2b",
        "b 2 b",
        "b-2-b",
    ],
    "umowa zlecenie": [
        "umowa zlecenie",
        "umowe zlecenie",
        "zlecenie",
    ],
    "umowa o dzieło": [
        "umowa o dzielo",
        "umowe o dzielo",
        "dzielo",
    ],
    "umowa agencyjna": [
        "umowa agencyjna",
        "agencyjna",
    ],
    "samozatrudnienie": [
        "samozatrudnienie",
        "self employed",
        "self employed contract",
    ],
}

PRACUJ_WORK_TIME_VARIANTS: dict[str, list[str]] = {
    "pełny etat": [
        "pelny etat",
        "pelen etat",
        "full time",
        "fulltime",
    ],
    "pół etatu": [
        "pol etatu",
        "czesc etatu",
        "part time",
        "parttime",
    ],
}

PRACUJ_WORK_MODE_VARIANTS: dict[str, list[str]] = {
    "stacjonarna": ["stacjonarna", "stacjonarnie", "onsite", "on site"],
    "hybrydowa": ["hybrydowa", "hybrydowo", "hybrid"],
    "zdalna": ["zdalna", "zdalnie", "remote", "home office", "work from home"],
}

PRACUJ_SHIFT_VARIANTS: dict[str, list[str]] = {
    "jedna zmiana": ["jedna zmiana", "1 zmiana", "i zmiana", "i-sza zmiana"],
    "dwie zmiany": ["dwie zmiany", "2 zmiany", "ii zmiana", "ii-ga zmiana"],
    "trzy zmiany": ["trzy zmiany", "3 zmiany", "iii zmiana", "iii-cia zmiana"],
}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def _to_array(value: Any) -> list[Any]:
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def _normalize_location(location: Any) -> str | None:
    if not location:
        return None
    if isinstance(location, str):
        return location

    address = location.get("address") if isinstance(location, dict) else None
    if isinstance(address, str):
        return address
    if isinstance(address, dict):
        parts = [address.get("addressLocality"), address.get("addressRegion"), address.get("addressCountry")]
        return ", ".join([p for p in parts if p]) or None
    return None


def _has_job_posting_type(type_value: Any) -> bool:
    if not type_value:
        return False
    if isinstance(type_value, str):
        return type_value == JOB_POSTING_TYPE
    if isinstance(type_value, list):
        return any(_has_job_posting_type(v) for v in type_value)
    return False


def _read_json_ld_objects(soup: BeautifulSoup) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    for node in soup.select(JSON_LD_SELECTOR):
        text = (node.get_text() or "").strip()
        if not text:
            continue
        try:
            parsed = json.loads(text)
        except Exception:
            continue

        if isinstance(parsed, list):
            objects.extend([item for item in parsed if isinstance(item, dict)])
        elif isinstance(parsed, dict):
            objects.append(parsed)

    return objects


def _strip_olx_suffix(title: str | None) -> str | None:
    if not title:
        return None
    cleaned = re.sub(r"\s*(?:•|-)\s*OLX\.pl\s*$", "", title, flags=re.IGNORECASE).strip()
    return cleaned or None


def _parse_rocketjobs_title_meta(title: str | None, source: str) -> dict[str, str | None]:
    if not title or source != "rocketjobs":
        return {"role": title, "company": None}

    parts = [part.strip() for part in title.split(" - ") if part.strip()]
    if len(parts) >= 2:
        return {"role": parts[0], "company": " - ".join(parts[1:])}
    return {"role": title, "company": None}


def _parse_pracuj_title_meta(title: str | None, source: str) -> dict[str, str | None]:
    if not title or source != "pracuj":
        return {"role": title, "company": None}

    match = re.match(r"^Oferta pracy\s+(.+?),\s+(.+?),\s+(.+)$", title, flags=re.IGNORECASE)
    if not match:
        return {"role": title, "company": None}

    return {
        "role": clean_text(match.group(1)),
        "company": clean_text(match.group(2)),
    }


def _extract_pracuj_employer_name_from_html(html: str, source: str) -> str | None:
    if source != "pracuj":
        return None

    match = re.search(r'"text-employerName":"([^"]+)"', html, flags=re.IGNORECASE) or re.search(
        r'"text-employer-name":"([^"]+)"', html, flags=re.IGNORECASE
    )
    if not match:
        return None

    encoded = match.group(1)
    try:
        escaped = encoded.replace('"', '\\"')
        decoded = json.loads('"' + escaped + '"')
    except Exception:
        decoded = encoded
    return clean_text(decoded)


def _normalize_keyword(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        (
            value.lower()
            .replace("ą", "a")
            .replace("ć", "c")
            .replace("ę", "e")
            .replace("ł", "l")
            .replace("ń", "n")
            .replace("ó", "o")
            .replace("ś", "s")
            .replace("ż", "z")
            .replace("ź", "z")
        ),
    ).strip()


def _normalize_for_match(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", _normalize_keyword(value))).strip()


def _contains_variant(normalized_text: str, variant: str) -> bool:
    normalized_variant = _normalize_for_match(variant)
    if not normalized_variant:
        return False
    return f" {normalized_variant} " in f" {normalized_text} "


def _extract_from_palette(normalized_text: str, palette: dict[str, list[str]], allow_multiple: bool) -> list[str]:
    matches: list[str] = []
    for canonical, variants in palette.items():
        if any(_contains_variant(normalized_text, variant) for variant in variants):
            matches.append(canonical)
            if not allow_multiple:
                break
    return matches


def _extract_working_hours(normalized_text: str) -> str | None:
    patterns = [
        r"\b(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})\b",
        r"\b(\d{1,2}\s*-\s*\d{1,2})\b",
        r"\b(\d{1,2}[:.]\d{2}\s*do\s*\d{1,2}[:.]\d{2})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized_text)
        if match:
            return clean_text(match.group(1))
    return None


def _extract_pracuj_conditions_from_html(html: str, source: str) -> dict[str, Any]:
    if source != "pracuj":
        return {}

    normalized = _normalize_for_match(re.sub(r"\s+", " ", html))
    contracts = _extract_from_palette(normalized, PRACUJ_CONTRACT_VARIANTS, allow_multiple=True)
    work_time = next(iter(_extract_from_palette(normalized, PRACUJ_WORK_TIME_VARIANTS, allow_multiple=False)), None)
    work_modes = _extract_from_palette(normalized, PRACUJ_WORK_MODE_VARIANTS, allow_multiple=True)
    if {"stacjonarna", "hybrydowa", "zdalna"}.issubset(set(work_modes)):
        work_mode = "dowolny"
    else:
        work_mode = work_modes[0] if work_modes else None
    shift_count = next(iter(_extract_from_palette(normalized, PRACUJ_SHIFT_VARIANTS, allow_multiple=False)), None)
    working_hours = _extract_working_hours(normalized)

    return {
        "employmentTypes": contracts,
        "workTime": work_time,
        "workMode": work_mode,
        "shiftCount": shift_count,
        "workingHours": working_hours,
    }


def parse_jobs_from_json_ld(html: str, source: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    json_ld = _read_json_ld_objects(soup)
    jobs: list[dict[str, Any]] = []

    for block in json_ld:
        items = block.get("@graph") if isinstance(block.get("@graph"), list) else [block]
        for item in items:
            if not isinstance(item, dict) or not _has_job_posting_type(item.get("@type")):
                continue

            location_parts = [_normalize_location(loc) for loc in _to_array(item.get("jobLocation"))]
            location = " | ".join([part for part in location_parts if part]) or None
            base_salary = item.get("baseSalary") if isinstance(item.get("baseSalary"), dict) else {}
            base_salary_value = base_salary.get("value") if isinstance(base_salary.get("value"), dict) else {}
            hiring_org = item.get("hiringOrganization") if isinstance(item.get("hiringOrganization"), dict) else {}

            jobs.append(
                {
                    "source": source,
                    "title": clean_text(item.get("title")),
                    "company": clean_text(hiring_org.get("name")),
                    "location": location,
                    "url": item.get("url"),
                    "datePosted": item.get("datePosted"),
                    "validThrough": item.get("validThrough"),
                    "salary": base_salary_value.get("value")
                    or base_salary_value.get("minValue")
                    or base_salary_value.get("maxValue"),
                    "raw": {"from": "json-ld"},
                }
            )

    return jobs


def parse_job_from_meta(html: str, source: str, fallback_url: str | None = None) -> dict[str, Any] | None:
    soup = BeautifulSoup(html, "html.parser")

    og_title_node = soup.select_one("meta[property='og:title']")
    og_title = clean_text(og_title_node.get("content") if og_title_node else None)
    doc_title = _strip_olx_suffix(clean_text(soup.title.string if soup.title else None))
    description_node = soup.select_one("meta[name='description']")
    description = clean_text(description_node.get("content") if description_node else None)
    og_description_node = soup.select_one("meta[property='og:description']")
    og_description = clean_text(og_description_node.get("content") if og_description_node else None)

    parsed_rocket = _parse_rocketjobs_title_meta(doc_title, source)
    parsed_pracuj = _parse_pracuj_title_meta(doc_title, source)
    parsed_role = parsed_rocket.get("role") or parsed_pracuj.get("role")
    parsed_company = parsed_rocket.get("company") or parsed_pracuj.get("company")
    pracuj_conditions = _extract_pracuj_conditions_from_html(html, source)

    pracuj_employer = _extract_pracuj_employer_name_from_html(html, source)
    title = og_title or parsed_role

    canonical_el = soup.select_one("link[rel='canonical']")
    canonical = clean_text(canonical_el.get("href") if canonical_el else None)
    url = canonical or fallback_url
    location = og_description if source == "rocketjobs" else None

    if not title and not description and not og_description:
        return None

    return {
        "source": source,
        "title": title,
        "company": pracuj_employer or parsed_company,
        "location": location,
        "url": url,
        "datePosted": None,
        "validThrough": None,
        "salary": None,
        "employmentTypes": pracuj_conditions.get("employmentTypes"),
        "workTime": pracuj_conditions.get("workTime"),
        "workMode": pracuj_conditions.get("workMode"),
        "shiftCount": pracuj_conditions.get("shiftCount"),
        "workingHours": pracuj_conditions.get("workingHours"),
        "raw": {"from": "meta"},
    }
