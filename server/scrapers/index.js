import { fetchHtml } from "./http.js";
import { getProvider, getSupportedSources } from "./providers/index.js";
import { parseJobFromMeta, parseJobsFromJsonLd } from "./parsers.js";

const UNKNOWN_SOURCE = "unknown";
const DIRECT_SCRAPE_HOST_MATCHERS = [
  ["pracuj.pl", "pracuj"],
  ["olx.pl", "olx"],
  ["nofluffjobs.com", "nofluffjobs"],
  ["rocketjobs.pl", "rocketjobs"],
  ["indeed.", "indeed"],
  ["justjoin.it", "justjoinit"]
];

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDateOnly(value) {
  const text = normalizeText(value);
  if (!text) return null;

  // Most providers return ISO strings; keep only date part.
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(endDate, startDate) {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return null;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000);
}

function getRecruitmentStatus(daysToExpire) {
  if (daysToExpire === null || daysToExpire === undefined) return null;
  if (daysToExpire < 0) {
    return { code: "expired", label: "Wygaslo", badgeColor: "black", textColor: "yellow" };
  }
  if (daysToExpire < 10) {
    return { code: "red", label: "Niezalecane", badgeColor: "red", textColor: "white" };
  }
  if (daysToExpire < 20) {
    return { code: "yellow", label: "Koncowka rekrutacji", badgeColor: "yellow", textColor: "black" };
  }
  return { code: "green", label: "Swieza oferta", badgeColor: "green", textColor: "white" };
}

function withRecruitmentWindow(job) {
  const datePosted = normalizeDateOnly(job.datePosted);
  const explicitExpiresAt = normalizeDateOnly(job.expiresAt);
  const expiresAt = explicitExpiresAt || (datePosted ? addDays(datePosted, 30) : null);
  const daysToExpire = expiresAt ? diffDays(expiresAt, getTodayDateOnly()) : null;

  return {
    ...job,
    datePosted,
    expiresAt,
    daysToExpire,
    recruitmentStatus: getRecruitmentStatus(daysToExpire)
  };
}

function clampLimit(limitPerSource) {
  return Math.max(1, Math.min(Number(limitPerSource) || 20, 50));
}

function normalizeJob(job, source) {
  return withRecruitmentWindow({
    source,
    title: normalizeText(job.title),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    url: normalizeText(job.url),
    datePosted: normalizeDateOnly(job.datePosted),
    expiresAt: normalizeDateOnly(job.validThrough || job.expiresAt),
    salary: job.salary || null,
    raw: job.raw || null
  });
}

async function scrapeSource(source, query, limitPerSource) {
  const provider = getProvider(source);
  if (!provider) {
    return {
      source,
      ok: false,
      jobs: [],
      error: `Unsupported source: ${source}`
    };
  }

  try {
    const url = provider.searchUrl(query);
    const html = await fetchHtml(url);
    const jobs = provider.parse(html, limitPerSource).map((job) => normalizeJob(job, source));

    return {
      source,
      ok: true,
      jobs,
      fetchedFrom: url,
      count: jobs.length
    };
  } catch (error) {
    return {
      source,
      ok: false,
      jobs: [],
      error: String(error)
    };
  }
}

export async function scrapeJobs({ query, sources, limitPerSource = 20 }) {
  const requestedSources = (Array.isArray(sources) && sources.length ? sources : getSupportedSources())
    .map((source) => String(source || "").toLowerCase().trim())
    .filter(Boolean);
  const safeLimit = clampLimit(limitPerSource);

  const settled = await Promise.all(requestedSources.map((source) => scrapeSource(source, query, safeLimit)));

  const jobs = settled.flatMap((entry) => entry.jobs);

  return {
    query,
    total: jobs.length,
    sources: settled,
    jobs
  };
}

function detectSourceFromHost(hostname) {
  for (const [matcher, source] of DIRECT_SCRAPE_HOST_MATCHERS) {
    if (hostname.includes(matcher)) return source;
  }

  return UNKNOWN_SOURCE;
}

export async function scrapeJobFromLink(urlInput) {
  const url = new URL(urlInput);
  const source = detectSourceFromHost(url.hostname.toLowerCase());

  if (source === UNKNOWN_SOURCE) {
    throw new Error("Unsupported domain for direct link scraping");
  }

  const html = await fetchHtml(url.toString());
  const fromJsonLd = parseJobsFromJsonLd(html, source);
  const fromMeta = parseJobFromMeta(html, source, url.toString());
  const fromJsonLdFirst = fromJsonLd.find((job) => job.title || job.company || job.url);
  const first =
    fromJsonLdFirst || fromMeta
      ? {
          ...(fromMeta || {}),
          ...(fromJsonLdFirst || {}),
          // Keep URL from meta/canonical when JSON-LD leaves it empty.
          url: normalizeText(fromJsonLdFirst?.url) || normalizeText(fromMeta?.url) || url.toString(),
          // Prefer company from JSON-LD, fallback to meta/title-derived value.
          company: normalizeText(fromJsonLdFirst?.company) || normalizeText(fromMeta?.company),
          title: normalizeText(fromJsonLdFirst?.title) || normalizeText(fromMeta?.title),
          location: normalizeText(fromJsonLdFirst?.location) || normalizeText(fromMeta?.location),
          datePosted: normalizeDateOnly(fromJsonLdFirst?.datePosted) || normalizeDateOnly(fromMeta?.datePosted),
          expiresAt: normalizeDateOnly(fromJsonLdFirst?.validThrough) || normalizeDateOnly(fromMeta?.validThrough),
          salary: fromJsonLdFirst?.salary || fromMeta?.salary || null,
          raw: fromJsonLdFirst?.raw || fromMeta?.raw || null
        }
      : null;

  if (!first) {
    throw new Error("Could not parse job data from this URL");
  }

  return withRecruitmentWindow({
    source,
    title: normalizeText(first.title),
    company: normalizeText(first.company),
    location: normalizeText(first.location),
    url: normalizeText(first.url) || url.toString(),
    datePosted: normalizeDateOnly(first.datePosted),
    expiresAt: normalizeDateOnly(first.expiresAt),
    salary: first.salary || null,
    raw: first.raw || null
  });
}

export { getSupportedSources };
