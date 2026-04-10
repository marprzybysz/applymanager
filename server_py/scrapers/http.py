from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests
from playwright.sync_api import sync_playwright

DEFAULT_HEADERS = {
    "user-agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "accept-language": "en-US,en;q=0.9,pl;q=0.8",
}
DEFAULT_TIMEOUT_SECONDS = 12
BROWSER_TIMEOUT_MS = 30000
BLOCKED_HTTP_STATUSES = {403, 429, 503}
BROWSER_FALLBACK_HOSTS = ["pracuj.pl"]


def _should_use_browser_fallback(url: str, status: int) -> bool:
    if status not in BLOCKED_HTTP_STATUSES:
        return False

    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return False

    hostname = hostname.lower()
    return any(host in hostname for host in BROWSER_FALLBACK_HOSTS)


def _fetch_html_with_browser(url: str) -> str:
    def _run() -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            )
            try:
                page = browser.new_page(
                    user_agent=DEFAULT_HEADERS["user-agent"],
                    locale="pl-PL",
                )
                page.goto(url, wait_until="domcontentloaded", timeout=BROWSER_TIMEOUT_MS)
                page.wait_for_timeout(1200)
                return page.content()
            finally:
                browser.close()

    # FastAPI async handlers run inside an event loop. Run Playwright sync API in a fresh worker thread.
    with ThreadPoolExecutor(max_workers=1) as executor:
        return executor.submit(_run).result()


def fetch_html(url: str) -> str:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
    if not response.ok:
        if _should_use_browser_fallback(url, response.status_code):
            return _fetch_html_with_browser(url)
        raise RuntimeError(f"HTTP {response.status_code} for {url}")
    return response.text
