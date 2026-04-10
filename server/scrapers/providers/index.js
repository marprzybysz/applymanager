import * as cheerio from "cheerio";
import { parseJobsFromJsonLd } from "../parsers.js";

function cleanText(value) {
  return value ? value.replace(/\s+/g, " ").trim() : null;
}

function parseBySelectors(html, source, selectors, baseUrl, limit) {
  const $ = cheerio.load(html);
  const results = [];

  $(selectors.card).each((index, element) => {
    if (results.length >= limit) return;

    const title = cleanText($(element).find(selectors.title).first().text());
    const company = selectors.company
      ? cleanText($(element).find(selectors.company).first().text())
      : null;
    const location = selectors.location
      ? cleanText($(element).find(selectors.location).first().text())
      : null;

    const href = $(element).find(selectors.link).first().attr("href") || null;
    const url = href ? new URL(href, baseUrl).toString() : null;

    if (title || url) {
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
    }

    if (index >= limit - 1) return false;
  });

  return results;
}

const providers = {
  olx: {
    source: "olx",
    searchUrl: (query) => `https://www.olx.pl/praca/q-${encodeURIComponent(query)}/`,
    parse: (html, limit) =>
      parseBySelectors(
        html,
        "olx",
        {
          card: "div[data-cy='l-card']",
          title: "h6",
          company: "p[data-testid='listing-ad-title-subtitle']",
          location: "p[data-testid='location-date']",
          link: "a"
        },
        "https://www.olx.pl",
        limit
      )
  },
  pracuj: {
    source: "pracuj",
    searchUrl: (query) => `https://www.pracuj.pl/praca/${encodeURIComponent(query)};kw`,
    parse: (html, limit) => {
      const fromJsonLd = parseJobsFromJsonLd(html, "pracuj");
      if (fromJsonLd.length) return fromJsonLd.slice(0, limit);

      return parseBySelectors(
        html,
        "pracuj",
        {
          card: "div[data-test='default-offer']",
          title: "h2, h3",
          company: "h4, [data-test='text-company-name']",
          location: "h5, [data-test='text-region']",
          link: "a"
        },
        "https://www.pracuj.pl",
        limit
      );
    }
  },
  nofluffjobs: {
    source: "nofluffjobs",
    searchUrl: (query) => `https://nofluffjobs.com/pl/jobs?criteria=keyword%3D${encodeURIComponent(query)}`,
    parse: (html, limit) => {
      const fromJsonLd = parseJobsFromJsonLd(html, "nofluffjobs");
      if (fromJsonLd.length) return fromJsonLd.slice(0, limit);

      return parseBySelectors(
        html,
        "nofluffjobs",
        {
          card: "a.posting-list-item",
          title: "h3, h2",
          company: "span.company-name, h4",
          location: "span.tw-text-neutral-500, .posting-list-item__location",
          link: "a"
        },
        "https://nofluffjobs.com",
        limit
      );
    }
  },
  rocketjobs: {
    source: "rocketjobs",
    searchUrl: (query) => `https://rocketjobs.pl/oferty-pracy?query=${encodeURIComponent(query)}`,
    parse: (html, limit) => {
      const fromJsonLd = parseJobsFromJsonLd(html, "rocketjobs");
      if (fromJsonLd.length) return fromJsonLd.slice(0, limit);

      return parseBySelectors(
        html,
        "rocketjobs",
        {
          card: "a[href*='/oferty-pracy/']",
          title: "h3, h2",
          company: "p, span",
          location: "span",
          link: "a"
        },
        "https://rocketjobs.pl",
        limit
      );
    }
  },
  indeed: {
    source: "indeed",
    searchUrl: (query) => `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`,
    parse: (html, limit) => {
      const fromJsonLd = parseJobsFromJsonLd(html, "indeed");
      if (fromJsonLd.length) return fromJsonLd.slice(0, limit);

      return parseBySelectors(
        html,
        "indeed",
        {
          card: "div.job_seen_beacon, div[data-testid='slider_item']",
          title: "h2.jobTitle, h2 a span",
          company: "span.companyName",
          location: "div.companyLocation",
          link: "h2 a"
        },
        "https://www.indeed.com",
        limit
      );
    }
  },
  justjoinit: {
    source: "justjoinit",
    searchUrl: (query) => `https://justjoin.it/job-offers/all-locations?keyword=${encodeURIComponent(query)}`,
    parse: (html, limit) => {
      const fromJsonLd = parseJobsFromJsonLd(html, "justjoinit");
      if (fromJsonLd.length) return fromJsonLd.slice(0, limit);

      return parseBySelectors(
        html,
        "justjoinit",
        {
          card: "a[data-test='offer-item']",
          title: "h3, h2",
          company: "h4, span",
          location: "span",
          link: "a"
        },
        "https://justjoin.it",
        limit
      );
    }
  }
};

export function getSupportedSources() {
  return Object.keys(providers);
}

export function getProvider(source) {
  return providers[source] || null;
}
