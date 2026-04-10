import { fetchHtml } from "./http.js";
import { getProvider, getSupportedSources } from "./providers/index.js";

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

export { getSupportedSources };
