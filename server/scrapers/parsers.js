import * as cheerio from "cheerio";

function readJsonLdObjects($) {
  const objects = [];

  $('script[type="application/ld+json"]').each((_, element) => {
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

export function parseJobsFromJsonLd(html, source) {
  const $ = cheerio.load(html);
  const jsonLd = readJsonLdObjects($);
  const jobs = [];

  for (const block of jsonLd) {
    const items = block?.["@graph"] ? block["@graph"] : [block];

    for (const item of items) {
      if (!item || item["@type"] !== "JobPosting") continue;

      const location = toArray(item.jobLocation)
        .map(normalizeLocation)
        .filter(Boolean)
        .join(" | ");

      jobs.push({
        source,
        title: item.title || null,
        company: item.hiringOrganization?.name || null,
        location: location || null,
        url: item.url || null,
        datePosted: item.datePosted || null,
        salary:
          item.baseSalary?.value?.value || item.baseSalary?.value?.minValue || item.baseSalary?.value?.maxValue || null,
        raw: { from: "json-ld" }
      });
    }
  }

  return jobs;
}
