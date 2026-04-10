import * as cheerio from "cheerio";
import { parseJobsFromJsonLd } from "../parsers.js";

function cleanText(value) {
  return value ? value.replace(/\s+/g, " ").trim() : null;
}

function normalizeLimit(limit) {
  const asNumber = Number(limit);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return 1;
  return Math.floor(asNumber);
}

function parseBySelectors(html, source, selectors, baseUrl, limit) {
  const $ = cheerio.load(html);
  const results = [];

  $(selectors.card).each((_, element) => {
    if (results.length >= limit) return false;

    const title = cleanText($(element).find(selectors.title).first().text());
    const company = selectors.company ? cleanText($(element).find(selectors.company).first().text()) : null;
    const location = selectors.location ? cleanText($(element).find(selectors.location).first().text()) : null;

    const href = $(element).find(selectors.link).first().attr("href") || null;
    const url = href ? new URL(href, baseUrl).toString() : null;

    if (!title && !url) {
      return;
    }

    results.push({
      source,
      title,
      company,
      location,
      url,
      datePosted: null,
      salary: null,
      raw: { from: "selector" }
    });
  });

  return results;
}

function parseWithOptionalJsonLd(html, config, limit) {
  const safeLimit = normalizeLimit(limit);

  if (config.useJsonLd) {
    const fromJsonLd = parseJobsFromJsonLd(html, config.source);
    if (fromJsonLd.length) {
      return fromJsonLd.slice(0, safeLimit);
    }
  }

  return parseBySelectors(html, config.source, config.selectors, config.baseUrl, safeLimit);
}

const PROVIDER_CONFIG = {
  olx: {
    source: "olx",
    searchUrl: (query) => `https://www.olx.pl/praca/q-${encodeURIComponent(query)}/`,
    baseUrl: "https://www.olx.pl",
    selectors: {
      card: "div[data-cy='l-card']",
      title: "h6",
      company: "p[data-testid='listing-ad-title-subtitle']",
      location: "p[data-testid='location-date']",
      link: "a"
    },
    useJsonLd: false
  },
  pracuj: {
    source: "pracuj",
    searchUrl: (query) => `https://www.pracuj.pl/praca/${encodeURIComponent(query)};kw`,
    baseUrl: "https://www.pracuj.pl",
    selectors: {
      card: "div[data-test='default-offer']",
      title: "h2, h3",
      company: "h4, [data-test='text-company-name']",
      location: "h5, [data-test='text-region']",
      link: "a"
    },
    useJsonLd: true
  },
  nofluffjobs: {
    source: "nofluffjobs",
    searchUrl: (query) => `https://nofluffjobs.com/pl/jobs?criteria=keyword%3D${encodeURIComponent(query)}`,
    baseUrl: "https://nofluffjobs.com",
    selectors: {
      card: "a.posting-list-item",
      title: "h3, h2",
      company: "span.company-name, h4",
      location: "span.tw-text-neutral-500, .posting-list-item__location",
      link: "a"
    },
    useJsonLd: true
  },
  rocketjobs: {
    source: "rocketjobs",
    searchUrl: (query) => `https://rocketjobs.pl/oferty-pracy?query=${encodeURIComponent(query)}`,
    baseUrl: "https://rocketjobs.pl",
    selectors: {
      card: "a[href*='/oferty-pracy/']",
      title: "h3, h2",
      company: "p, span",
      location: "span",
      link: "a"
    },
    useJsonLd: true
  },
  indeed: {
    source: "indeed",
    searchUrl: (query) => `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`,
    baseUrl: "https://www.indeed.com",
    selectors: {
      card: "div.job_seen_beacon, div[data-testid='slider_item']",
      title: "h2.jobTitle, h2 a span",
      company: "span.companyName",
      location: "div.companyLocation",
      link: "h2 a"
    },
    useJsonLd: true
  },
  justjoinit: {
    source: "justjoinit",
    searchUrl: (query) => `https://justjoin.it/job-offers/all-locations?keyword=${encodeURIComponent(query)}`,
    baseUrl: "https://justjoin.it",
    selectors: {
      card: "a[data-test='offer-item']",
      title: "h3, h2",
      company: "h4, span",
      location: "span",
      link: "a"
    },
    useJsonLd: true
  }
};

const providers = Object.fromEntries(
  Object.entries(PROVIDER_CONFIG).map(([key, config]) => [
    key,
    {
      source: config.source,
      searchUrl: config.searchUrl,
      parse: (html, limit) => parseWithOptionalJsonLd(html, config, limit)
    }
  ])
);

export function getSupportedSources() {
  return Object.keys(providers);
}

export function getProvider(source) {
  return providers[source] || null;
}
