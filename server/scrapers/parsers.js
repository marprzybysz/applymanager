import * as cheerio from "cheerio";

const JSON_LD_SELECTOR = 'script[type="application/ld+json"]';
const JOB_POSTING_TYPE = "JobPosting";

function readJsonLdObjects($) {
  const objects = [];

  $(JSON_LD_SELECTOR).each((_, element) => {
    const text = $(element).text()?.trim();
    if (!text) return;

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        objects.push(...parsed);
      } else {
        objects.push(parsed);
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  });

  return objects;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeLocation(location) {
  if (!location) return null;
  if (typeof location === "string") return location;

  if (location.address) {
    const address = location.address;
    if (typeof address === "string") return address;
    const parts = [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  return null;
}

function hasJobPostingType(typeValue) {
  if (!typeValue) return false;
  if (typeof typeValue === "string") return typeValue === JOB_POSTING_TYPE;
  if (Array.isArray(typeValue)) return typeValue.some((entry) => hasJobPostingType(entry));
  return false;
}

function cleanText(value) {
  return value ? String(value).replace(/\s+/g, " ").trim() : null;
}

function stripOlxSuffix(title) {
  if (!title) return null;
  return title.replace(/\s*(?:•|-)\s*OLX\.pl\s*$/i, "").trim() || null;
}

function parseRocketJobsTitleMeta(title, source) {
  if (!title || source !== "rocketjobs") {
    return { role: title || null, company: null };
  }

  const parts = title.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { role: parts[0] || null, company: parts.slice(1).join(" - ") || null };
  }

  return { role: title, company: null };
}

function parsePracujTitleMeta(title, source) {
  if (!title || source !== "pracuj") {
    return { role: title || null, company: null };
  }

  const match = title.match(/^Oferta pracy\s+(.+?),\s+(.+?),\s+(.+)$/i);
  if (!match) {
    return { role: title, company: null };
  }

  return {
    role: cleanText(match[1]) || null,
    company: cleanText(match[2]) || null
  };
}

function decodeJsonString(value) {
  if (!value) return null;

  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

function extractPracujEmployerNameFromHtml(html, source) {
  if (source !== "pracuj") return null;

  const match =
    html.match(/"text-employerName":"([^"]+)"/i) || html.match(/"text-employer-name":"([^"]+)"/i);
  if (!match?.[1]) return null;

  return cleanText(decodeJsonString(match[1]));
}

function mapJsonLdJob(item, source) {
  const location = toArray(item.jobLocation)
    .map(normalizeLocation)
    .filter(Boolean)
    .join(" | ");

  return {
    source,
    title: cleanText(item.title) || null,
    company: cleanText(item.hiringOrganization?.name) || null,
    location: location || null,
    url: item.url || null,
    datePosted: item.datePosted || null,
    validThrough: item.validThrough || null,
    salary:
      item.baseSalary?.value?.value || item.baseSalary?.value?.minValue || item.baseSalary?.value?.maxValue || null,
    raw: { from: "json-ld" }
  };
}

export function parseJobsFromJsonLd(html, source) {
  const $ = cheerio.load(html);
  const jsonLd = readJsonLdObjects($);
  const jobs = [];

  for (const block of jsonLd) {
    const items = block?.["@graph"] ? block["@graph"] : [block];

    for (const item of items) {
      if (!item || !hasJobPostingType(item["@type"])) continue;
      jobs.push(mapJsonLdJob(item, source));
    }
  }

  return jobs;
}

export function parseJobFromMeta(html, source, fallbackUrl = null) {
  const $ = cheerio.load(html);
  const ogTitle = cleanText($("meta[property='og:title']").attr("content"));
  const docTitle = stripOlxSuffix(cleanText($("title").first().text()));
  const description = cleanText($("meta[name='description']").attr("content"));
  const ogDescription = cleanText($("meta[property='og:description']").attr("content"));
  const parsedRocketJobsTitle = parseRocketJobsTitleMeta(docTitle, source);
  const parsedPracujTitle = parsePracujTitleMeta(docTitle, source);
  const parsedTitle = {
    role: parsedRocketJobsTitle.role || parsedPracujTitle.role,
    company: parsedRocketJobsTitle.company || parsedPracujTitle.company
  };
  const pracujEmployerName = extractPracujEmployerNameFromHtml(html, source);
  const title = ogTitle || parsedTitle.role;

  const canonical = $("link[rel='canonical']").attr("href");
  const url = cleanText(canonical) || fallbackUrl || null;
  const location = source === "rocketjobs" ? ogDescription || null : null;

  if (!title && !description && !ogDescription) {
    return null;
  }

  return {
    source,
    title: title || null,
    company: pracujEmployerName || parsedTitle.company || null,
    location,
    url,
    datePosted: null,
    validThrough: null,
    salary: null,
    raw: { from: "meta" }
  };
}
