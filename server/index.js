import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import * as XLSX from "xlsx";
import { getSupportedSources, scrapeJobFromLink, scrapeJobs } from "./scrapers/index.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const { Pool } = pg;

const dbPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "applymanager",
  password: process.env.DB_PASSWORD || "applymanager",
  database: process.env.DB_NAME || "applymanager"
});

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");

app.use(express.json());

const EXCEL_FIELDS = {
  company: ["company", "Company", "firma", "Firma"],
  role: ["role", "Role", "position", "Position", "stanowisko", "Stanowisko"],
  applied: ["applied", "Applied", "aplikowano", "Aplikowano"],
  status: ["status", "Status"],
  location: ["location", "Location", "lokalizacja", "Lokalizacja"],
  notes: ["notes", "Notes", "notatki", "Notatki"],
  appliedAt: ["applied_at", "appliedAt", "date", "Date", "data", "Data", "data aplikacji", "Data aplikacji"],
  source: ["source", "Source", "portal", "Portal"],
  sourceUrl: ["url", "URL", "link", "Link", "hyperlink", "Hyperlink"],
  sourceUrlLink: ["__link__url", "__link__URL", "__link__link", "__link__Link", "__link__hyperlink", "__link__Hyperlink"]
};

function toNonEmptyString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function toBooleanOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;

  if (["true", "1", "yes", "y", "tak", "t", "applied"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "nie", "f", "not_applied", "not-applied"].includes(normalized)) return false;
  return null;
}

function parseExcelDateNumber(value) {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed?.y || !parsed?.m || !parsed?.d) return null;

  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return date.toISOString().slice(0, 10);
}

function safeDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const fromExcelNumber = parseExcelDateNumber(value);
    if (fromExcelNumber) return fromExcelNumber;
  }

  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && value.trim() !== "") {
      const fromExcelNumber = parseExcelDateNumber(asNumber);
      if (fromExcelNumber) return fromExcelNumber;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function pickFirstValue(row, candidates) {
  for (const key of candidates) {
    const value = toNonEmptyString(row[key]);
    if (value) return value;
  }

  return null;
}

function mapExcelRowToOffer(row) {
  const company = pickFirstValue(row, EXCEL_FIELDS.company);
  const role = pickFirstValue(row, EXCEL_FIELDS.role);

  if (!company || !role) {
    return null;
  }

  const directSourceUrl = pickFirstValue(row, EXCEL_FIELDS.sourceUrl);
  const linkedSourceUrl = pickFirstValue(row, EXCEL_FIELDS.sourceUrlLink);

  const applied = toBooleanOrNull(pickFirstValue(row, EXCEL_FIELDS.applied)) ?? true;
  const explicitStatus = pickFirstValue(row, EXCEL_FIELDS.status);

  return {
    company,
    role,
    applied,
    status: explicitStatus || (applied ? "applied" : "saved"),
    location: pickFirstValue(row, EXCEL_FIELDS.location),
    notes: pickFirstValue(row, EXCEL_FIELDS.notes),
    appliedAt: safeDate(pickFirstValue(row, EXCEL_FIELDS.appliedAt)),
    source: pickFirstValue(row, EXCEL_FIELDS.source),
    sourceUrl: isAbsoluteHttpUrl(directSourceUrl) ? directSourceUrl : linkedSourceUrl || null
  };
}

function readExcelRowsWithHyperlinks(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true });
  if (!matrix.length) return [];

  const headers = matrix[0].map((value) => String(value || "").trim());
  const rows = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const rowValues = matrix[rowIndex] || [];
    const row = {};

    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
      const header = headers[colIndex];
      if (!header) continue;

      row[header] = rowValues[colIndex] ?? "";

      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = worksheet[cellAddress];
      if (cell?.l?.Target) {
        row[`__link__${header}`] = String(cell.l.Target).trim();
      }
    }

    rows.push(row);
  }

  return rows;
}

function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractFirstHttpUrl(input) {
  const text = toNonEmptyString(input);
  if (!text) return null;

  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match?.[0]) return null;

  // Trim trailing punctuation that often appears in copy-pasted text.
  return match[0].replace(/[),.;!?]+$/g, "");
}

function normalizeScrapeUrl(input) {
  const candidate = extractFirstHttpUrl(input) || toNonEmptyString(input);
  if (!candidate || !isAbsoluteHttpUrl(candidate)) return null;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();

    // Copy-pasted Pracuj links often include tracking params that are unnecessary for scraping.
    if (host.includes("pracuj.pl")) {
      url.search = "";
      url.hash = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function mapOfferForInsertFromRequest(body) {
  const applied = toBooleanOrNull(body?.applied);

  return {
    company: toNonEmptyString(body?.company) || "",
    role: toNonEmptyString(body?.role) || "",
    applied: applied ?? true,
    status: toNonEmptyString(body?.status) || ((applied ?? true) ? "applied" : "saved"),
    location: toNonEmptyString(body?.location),
    notes: toNonEmptyString(body?.notes),
    appliedAt: body?.appliedAt,
    source: toNonEmptyString(body?.source),
    sourceUrl: toNonEmptyString(body?.sourceUrl)
  };
}

async function ensureSchema() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      applied BOOLEAN NOT NULL DEFAULT TRUE,
      status TEXT NOT NULL DEFAULT 'applied',
      location TEXT,
      notes TEXT,
      applied_at DATE,
      source TEXT,
      source_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await dbPool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied BOOLEAN");
  await dbPool.query("UPDATE applications SET applied = TRUE WHERE applied IS NULL");
  await dbPool.query("ALTER TABLE applications ALTER COLUMN applied SET DEFAULT TRUE");
  await dbPool.query("ALTER TABLE applications ALTER COLUMN applied SET NOT NULL");
  await dbPool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source TEXT");
  await dbPool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_url TEXT");
}

async function insertOffer(offer) {
  const result = await dbPool.query(
    `
      INSERT INTO applications (company, role, applied, status, location, notes, applied_at, source, source_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, company, role, applied, status, location, notes, applied_at AS "appliedAt", source, source_url AS "sourceUrl", created_at AS "createdAt"
    `,
    [
      offer.company,
      offer.role,
      offer.applied ?? true,
      offer.status || (offer.applied === false ? "saved" : "applied"),
      offer.location || null,
      offer.notes || null,
      safeDate(offer.appliedAt),
      offer.source || null,
      offer.sourceUrl || null
    ]
  );

  return result.rows[0];
}

async function listOffers() {
  const result = await dbPool.query(
    `
      SELECT
        id,
        company,
        role,
        applied,
        status,
        location,
        notes,
        applied_at AS "appliedAt",
        source,
        source_url AS "sourceUrl",
        created_at AS "createdAt"
      FROM applications
      ORDER BY created_at DESC
      LIMIT 500
    `
  );

  return result.rows;
}

app.get("/api/greet", (req, res) => {
  const name = typeof req.query.name === "string" && req.query.name.trim() ? req.query.name.trim() : "friend";
  res.json({ message: `Hello, ${name}! Node backend is connected.` });
});

app.get("/api/health", async (_req, res) => {
  try {
    const result = await dbPool.query("SELECT NOW() AS now");
    res.json({ ok: true, db: "connected", now: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ ok: false, db: "disconnected", error: String(error) });
  }
});

app.get("/api/offers", async (_req, res) => {
  try {
    const offers = await listOffers();
    res.json({ ok: true, offers });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get("/api/offers/export-excel", async (_req, res) => {
  try {
    const offers = await listOffers();
    const rows = offers.map((offer) => ({
      company: offer.company || "",
      role: offer.role || "",
      applied: offer.applied ?? true,
      status: offer.status || "",
      location: offer.location || "",
      notes: offer.notes || "",
      appliedAt: offer.appliedAt || "",
      source: offer.source || "",
      sourceUrl: offer.sourceUrl || "",
      createdAt: offer.createdAt || ""
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "applications");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `applymanager-offers-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post("/api/offers", async (req, res) => {
  const offerInput = mapOfferForInsertFromRequest(req.body);
  const { company, role } = offerInput;

  if (!company || !role) {
    return res.status(400).json({ ok: false, error: "company and role are required" });
  }

  try {
    const offer = await insertOffer(offerInput);
    return res.status(201).json({ ok: true, offer });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
});

app.post("/api/offers/import-excel", upload.single("file"), async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ ok: false, error: "file is required" });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = readExcelRowsWithHyperlinks(worksheet);

    const mappedOffers = rows.map(mapExcelRowToOffer).filter(Boolean);

    const saved = [];
    for (const offer of mappedOffers) {
      const inserted = await insertOffer(offer);
      saved.push(inserted);
    }

    return res.json({
      ok: true,
      imported: saved.length,
      skipped: rows.length - saved.length,
      offers: saved
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get("/api/scrape/sources", (_req, res) => {
  res.json({
    sources: getSupportedSources()
  });
});

app.post("/api/scrape", async (req, res) => {
  const query = toNonEmptyString(req.body?.query) || "";
  const sources = Array.isArray(req.body?.sources) ? req.body.sources : undefined;
  const limitPerSource = Number(req.body?.limitPerSource || 20);

  if (!query) {
    return res.status(400).json({
      ok: false,
      error: "query is required"
    });
  }

  try {
    const normalizedQueryUrl = normalizeScrapeUrl(query);
    if (normalizedQueryUrl) {
      const job = await scrapeJobFromLink(normalizedQueryUrl);
      return res.json({
        ok: true,
        mode: "link",
        query: normalizedQueryUrl,
        total: 1,
        sources: [{ source: job.source, ok: true, jobs: [job], fetchedFrom: normalizedQueryUrl, count: 1 }],
        jobs: [job]
      });
    }

    const result = await scrapeJobs({ query, sources, limitPerSource });
    return res.json({
      ok: true,
      mode: "search",
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
});

app.post("/api/scrape/link", async (req, res) => {
  const url = normalizeScrapeUrl(req.body?.url) || "";

  if (!url) {
    return res.status(400).json({
      ok: false,
      error: "url is required"
    });
  }

  try {
    const parsed = await scrapeJobFromLink(url);
    return res.json({
      ok: true,
      job: parsed
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: String(error)
    });
  }
});

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`ApplyManager server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database schema:", error);
    process.exit(1);
  });
