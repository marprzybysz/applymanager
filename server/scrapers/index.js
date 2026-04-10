import { fetchHtml } from "./http.js";
import { getProvider, getSupportedSources } from "./providers/index.js";
import { parseJobFromMeta, parseJobsFromJsonLd } from "./parsers.js";

function normalizeJob(job, source) {
  return {
    source,
    title: job.title || null,
    company: job.company || null,
    location: job.location || null,
    url: job.url || null,
    datePosted: job.datePosted || null,
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
  const requestedSources = (Array.isArray(sources) && sources.length ? sources : getSupportedSources()).map((source) =>
    source.toLowerCase().trim()
  );

  const settled = await Promise.all(
    requestedSources.map((source) => scrapeSource(source, query, Math.max(1, Math.min(limitPerSource, 50))))
  );

  const jobs = settled.flatMap((entry) => entry.jobs);

  return {
    query,
    total: jobs.length,
    sources: settled,
    jobs
  };
}

function detectSourceFromHost(hostname) {
  if (hostname.includes("pracuj.pl")) return "pracuj";
  if (hostname.includes("olx.pl")) return "olx";
  if (hostname.includes("nofluffjobs.com")) return "nofluffjobs";
  if (hostname.includes("rocketjobs.pl")) return "rocketjobs";
  if (hostname.includes("indeed.")) return "indeed";
  if (hostname.includes("justjoin.it")) return "justjoinit";
  return "unknown";
}

export async function scrapeJobFromLink(urlInput) {
  const url = new URL(urlInput);
  const source = detectSourceFromHost(url.hostname.toLowerCase());

  if (source === "unknown") {
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
    title: first.title || null,
    company: first.company || null,
    location: first.location || null,
    url: first.url || url.toString(),
    datePosted: first.datePosted || null,
    salary: first.salary || null,
    raw: first.raw || null
  };
}

export { getSupportedSources };
