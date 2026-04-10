import { chromium } from "playwright";

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9,pl;q=0.8"
};
const DEFAULT_TIMEOUT_MS = 12000;
const BROWSER_TIMEOUT_MS = 30000;
const BLOCKED_HTTP_STATUSES = new Set([403, 429, 503]);
const BROWSER_FALLBACK_HOSTS = ["pracuj.pl"];

function shouldUseBrowserFallback(url, status) {
  if (!BLOCKED_HTTP_STATUSES.has(status)) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BROWSER_FALLBACK_HOSTS.some((host) => hostname.includes(host));
  } catch {
    return false;
  }
}

async function fetchHtmlWithBrowser(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const page = await browser.newPage({
      userAgent: DEFAULT_HEADERS["user-agent"],
      locale: "pl-PL"
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: BROWSER_TIMEOUT_MS });
    await page.waitForTimeout(1200);
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    });

    if (!response.ok) {
      if (shouldUseBrowserFallback(url, response.status)) {
        return await fetchHtmlWithBrowser(url);
      }
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
