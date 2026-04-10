from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urljoin

from bs4 import BeautifulSoup

from .parsers import parse_jobs_from_json_ld


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).split()).strip()
    return text or None


def normalize_limit(limit: int | float | str | None) -> int:
    try:
        as_number = int(float(limit if limit is not None else 1))
    except Exception:
        return 1
    return max(1, as_number)


@dataclass(frozen=True)
class ProviderConfig:
    source: str
    search_url: Any
    base_url: str
    selectors: dict[str, str]
    use_json_ld: bool


def parse_by_selectors(html: str, source: str, selectors: dict[str, str], base_url: str, limit: int) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict[str, Any]] = []

    for element in soup.select(selectors["card"]):
        if len(results) >= limit:
            break

        title_el = element.select_one(selectors["title"]) if selectors.get("title") else None
        company_el = element.select_one(selectors["company"]) if selectors.get("company") else None
        location_el = element.select_one(selectors["location"]) if selectors.get("location") else None
        link_el = element.select_one(selectors["link"]) if selectors.get("link") else None

        title = clean_text(title_el.get_text(" ", strip=True) if title_el else None)
        company = clean_text(company_el.get_text(" ", strip=True) if company_el else None)
        location = clean_text(location_el.get_text(" ", strip=True) if location_el else None)
        href = link_el.get("href") if link_el else None
        url = urljoin(base_url, href) if href else None

        if not title and not url:
            continue

        results.append(
            {
                "source": source,
                "title": title,
                "company": company,
                "location": location,
                "url": url,
                "datePosted": None,
                "salary": None,
                "raw": {"from": "selector"},
            }
        )

    return results


def parse_with_optional_json_ld(html: str, config: ProviderConfig, limit: int) -> list[dict[str, Any]]:
    safe_limit = normalize_limit(limit)

    if config.use_json_ld:
        from_json_ld = parse_jobs_from_json_ld(html, config.source)
        if from_json_ld:
            return from_json_ld[:safe_limit]

    return parse_by_selectors(html, config.source, config.selectors, config.base_url, safe_limit)


PROVIDER_CONFIG: dict[str, ProviderConfig] = {
    "olx": ProviderConfig(
        source="olx",
        search_url=lambda query: f"https://www.olx.pl/praca/q-{quote(query)}/",
        base_url="https://www.olx.pl",
        selectors={
            "card": "div[data-cy='l-card']",
            "title": "h6",
            "company": "p[data-testid='listing-ad-title-subtitle']",
            "location": "p[data-testid='location-date']",
            "link": "a",
        },
        use_json_ld=False,
    ),
    "pracuj": ProviderConfig(
        source="pracuj",
        search_url=lambda query: f"https://www.pracuj.pl/praca/{quote(query)};kw",
        base_url="https://www.pracuj.pl",
        selectors={
            "card": "div[data-test='default-offer']",
            "title": "h2, h3",
            "company": "h4, [data-test='text-company-name']",
            "location": "h5, [data-test='text-region']",
            "link": "a",
        },
        use_json_ld=True,
    ),
    "nofluffjobs": ProviderConfig(
        source="nofluffjobs",
        search_url=lambda query: f"https://nofluffjobs.com/pl/jobs?criteria=keyword%3D{quote(query)}",
        base_url="https://nofluffjobs.com",
        selectors={
            "card": "a.posting-list-item",
            "title": "h3, h2",
            "company": "span.company-name, h4",
            "location": "span.tw-text-neutral-500, .posting-list-item__location",
            "link": "a",
        },
        use_json_ld=True,
    ),
    "rocketjobs": ProviderConfig(
        source="rocketjobs",
        search_url=lambda query: f"https://rocketjobs.pl/oferty-pracy?query={quote(query)}",
        base_url="https://rocketjobs.pl",
        selectors={
            "card": "a[href*='/oferty-pracy/']",
            "title": "h3, h2",
            "company": "p, span",
            "location": "span",
            "link": "a",
        },
        use_json_ld=True,
    ),
    "indeed": ProviderConfig(
        source="indeed",
        search_url=lambda query: f"https://www.indeed.com/jobs?q={quote(query)}",
        base_url="https://www.indeed.com",
        selectors={
            "card": "div.job_seen_beacon, div[data-testid='slider_item']",
            "title": "h2.jobTitle, h2 a span",
            "company": "span.companyName",
            "location": "div.companyLocation",
            "link": "h2 a",
        },
        use_json_ld=True,
    ),
    "justjoinit": ProviderConfig(
        source="justjoinit",
        search_url=lambda query: f"https://justjoin.it/job-offers/all-locations?keyword={quote(query)}",
        base_url="https://justjoin.it",
        selectors={
            "card": "a[data-test='offer-item']",
            "title": "h3, h2",
            "company": "h4, span",
            "location": "span",
            "link": "a",
        },
        use_json_ld=True,
    ),
}


def get_supported_sources() -> list[str]:
    return list(PROVIDER_CONFIG.keys())


def get_provider(source: str) -> ProviderConfig | None:
    return PROVIDER_CONFIG.get(source)
