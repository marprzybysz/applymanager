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

function clampLimit(limitPerSource) {
  return Math.max(1, Math.min(Number(limitPerSource) || 20, 50));
}

function normalizeJob(job, source) {
  return {
    source,
    title: normalizeText(job.title),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    url: normalizeText(job.url),
    datePosted: normalizeText(job.datePosted),
    salary: job.salary || null,
    raw: job.raw || null
  };
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
  const first = fromJsonLd.find((job) => job.title || job.company || job.url) || parseJobFromMeta(html, source, url.toString());

  if (!first) {
    throw new Error("Could not parse job data from this URL");
  }

  return {
    source,
    title: normalizeText(first.title),
    company: normalizeText(first.company),
    location: normalizeText(first.location),
    url: normalizeText(first.url) || url.toString(),
    datePosted: normalizeText(first.datePosted),
    salary: first.salary || null,
    raw: first.raw || null
  };
}

export { getSupportedSources };
