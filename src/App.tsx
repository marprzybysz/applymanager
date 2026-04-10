import { FormEvent, useEffect, useState } from "react";

type Offer = {
  id?: number;
  company: string;
  role: string;
  status: string;
  location?: string | null;
  notes?: string | null;
  appliedAt?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
};

type ScrapedJob = {
  source: string;
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  datePosted: string | null;
};

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const DEFAULT_OFFER: Offer = {
  company: "",
  role: "",
  status: "applied",
  location: "",
  notes: "",
  appliedAt: "",
  source: "manual",
  sourceUrl: ""
};

export function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerForm, setOfferForm] = useState<Offer>(DEFAULT_OFFER);
  const [scrapeQuery, setScrapeQuery] = useState("frontend react");
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [pendingScrapedIndex, setPendingScrapedIndex] = useState<number | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready");
  const isUrlMode = isAbsoluteHttpUrl(scrapeQuery.trim());

  async function fetchOffers() {
    const response = await fetch("/api/offers");
    const data = (await response.json()) as { ok: boolean; offers?: Offer[]; error?: string };
    if (!data.ok) {
      throw new Error(data.error || "Failed to fetch offers");
    }
    setOffers(data.offers || []);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffers()])
      .then(() => setMessage("Data loaded"))
      .catch((error) => setMessage(String(error)))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offerForm)
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || "Failed to add offer");
      }

      setOfferForm(DEFAULT_OFFER);
      await fetchOffers();
      setMessage("Offer added");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!excelFile) {
      setMessage("Select .xlsx file first");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const response = await fetch("/api/offers/import-excel", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { ok: boolean; imported?: number; skipped?: number; error?: string };
      if (!data.ok) {
        throw new Error(data.error || "Excel import failed");
      }

      await fetchOffers();
      setExcelFile(null);
      setMessage(`Excel imported: ${data.imported ?? 0}, skipped: ${data.skipped ?? 0}`);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleScrape(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scrapeQuery
        })
      });

      const data = (await response.json()) as {
        ok: boolean;
        mode?: "link" | "search";
        jobs?: ScrapedJob[];
        total?: number;
        error?: string;
      };
      if (!data.ok) {
        throw new Error(data.error || "Scrape failed");
      }

      const jobs = data.jobs || [];
      setScrapedJobs(jobs);
      setMessage(`Scraped jobs: ${data.total ?? 0}`);

      if (data.mode === "link" && jobs[0]) {
        setPendingOffer({
          company: jobs[0].company || "Unknown company",
          role: jobs[0].title || "Unknown role",
          status: "applied",
          location: jobs[0].location,
          notes: "",
          appliedAt: new Date().toISOString().slice(0, 10),
          source: jobs[0].source,
          sourceUrl: jobs[0].url
        });
        setPendingScrapedIndex(0);
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function openSaveDialog(job: ScrapedJob, index: number) {
    setPendingOffer({
      company: job.company || "Unknown company",
      role: job.title || "Unknown role",
      status: "applied",
      location: job.location,
      notes: "",
      appliedAt: new Date().toISOString().slice(0, 10),
      source: job.source,
      sourceUrl: job.url
    });
    setPendingScrapedIndex(index);
  }

  function applyPendingChangesToScraped() {
    if (!pendingOffer || pendingScrapedIndex === null) return;

    setScrapedJobs((prev) =>
      prev.map((job, index) =>
        index === pendingScrapedIndex
          ? {
              ...job,
              title: pendingOffer.role,
              company: pendingOffer.company,
              location: pendingOffer.location || null,
              source: pendingOffer.source || job.source,
              url: pendingOffer.sourceUrl || null
            }
          : job
      )
    );
    setMessage("Scraped record updated");
  }

  async function confirmSavePendingOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingOffer) return;

    setLoading(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingOffer)
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || "Failed to save scraped job");
      }

      await fetchOffers();
      setPendingOffer(null);
      setPendingScrapedIndex(null);
      setMessage("Scraped job saved to offers");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    window.open("/api/offers/export-excel", "_blank");
  }

  return (
    <main className="app">
      <header className="header">
        <h1>ApplyManager</h1>
        <p>Manual offers, scrape jobs, and import your Excel tracker.</p>
        <button type="button" onClick={exportExcel}>
          Export Offers to Excel
        </button>
      </header>

      <p className="status">{loading ? "Working..." : message}</p>

      <section className="card">
        <h2>Add Offer</h2>
        <form className="grid" onSubmit={handleAddOffer}>
          <input
            value={offerForm.company}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, company: event.target.value }))}
            placeholder="Company"
            required
          />
          <input
            value={offerForm.role}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, role: event.target.value }))}
            placeholder="Role"
            required
          />
          <input
            value={offerForm.status}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, status: event.target.value }))}
            placeholder="Status (applied/interview/offer/rejected)"
          />
          <input
            value={offerForm.location || ""}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Location"
          />
          <input
            type="date"
            value={offerForm.appliedAt || ""}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, appliedAt: event.target.value }))}
          />
          <input
            value={offerForm.source || ""}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, source: event.target.value }))}
            placeholder="Source (manual/pracuj/etc.)"
          />
          <input
            className="span-2"
            value={offerForm.sourceUrl || ""}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
            placeholder="Offer URL"
          />
          <textarea
            className="span-2"
            value={offerForm.notes || ""}
            onChange={(event) => setOfferForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
          />
          <button className="span-2" type="submit" disabled={loading}>
            Add Offer
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Import Excel</h2>
        <form className="row" onSubmit={handleImportExcel}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
          />
          <button type="submit" disabled={loading}>
            Import
          </button>
        </form>
        <p className="hint">Supported columns: Firma, Stanowisko, Lokalizacja, Status, Data aplikacji, Notatki, Hyperlink (or company/role/date/url variants).</p>
      </section>

      <section className="card">
        <h2>Scrape Jobs</h2>
        <form className="row" onSubmit={handleScrape}>
          <input
            value={scrapeQuery}
            onChange={(event) => setScrapeQuery(event.target.value)}
            placeholder="Search phrase OR offer URL (e.g. https://www.pracuj.pl/...)"
            required
          />
          <button type="submit" disabled={loading}>
            Scrape
          </button>
        </form>
        <p className="hint">
          {isUrlMode
            ? "URL mode: source is auto-detected by backend."
            : "Phrase mode: backend searches supported job sources."}
        </p>

        <div className="list">
          {scrapedJobs.map((job, index) => (
            <article className="item" key={`${job.source}-${job.url || index}`}>
              <div>
                <strong>{job.title || "Unknown role"}</strong>
                <p>
                  {job.company || "Unknown company"} | {job.location || "Unknown location"} | {job.source}
                </p>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer">
                    {job.url}
                  </a>
                ) : null}
              </div>
              <div className="item-actions">
                <button type="button" className="ghost-btn" onClick={() => openSaveDialog(job, index)} disabled={loading}>
                  Edit
                </button>
                <button type="button" onClick={() => openSaveDialog(job, index)} disabled={loading}>
                  Save
                </button>
              </div>
            </article>
          ))}
          {scrapedJobs.length === 0 ? <p className="hint">No scraped jobs yet.</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Offers ({offers.length})</h2>
        <div className="list">
          {offers.map((offer, index) => (
            <article className="item" key={`${offer.id || "offer"}-${index}`}>
              <div>
                <strong>
                  {offer.role} @ {offer.company}
                </strong>
                <p>
                  {offer.status} | {offer.location || "-"} | {offer.appliedAt || "-"} | {offer.source || "manual"}
                </p>
                {offer.sourceUrl ? (
                  <a href={offer.sourceUrl} target="_blank" rel="noreferrer">
                    {offer.sourceUrl}
                  </a>
                ) : null}
                {offer.notes ? <p>{offer.notes}</p> : null}
              </div>
            </article>
          ))}
          {offers.length === 0 ? <p className="hint">No offers in database yet.</p> : null}
        </div>
      </section>

      {pendingOffer ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm And Save Offer</h3>
            <form className="grid" onSubmit={confirmSavePendingOffer}>
              <input
                value={pendingOffer.company}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, company: event.target.value } : prev))}
                placeholder="Company"
                required
              />
              <input
                value={pendingOffer.role}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, role: event.target.value } : prev))}
                placeholder="Role"
                required
              />
              <input
                value={pendingOffer.status}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                placeholder="Status"
              />
              <input
                value={pendingOffer.location || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, location: event.target.value } : prev))}
                placeholder="Location"
              />
              <input
                type="date"
                value={pendingOffer.appliedAt || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, appliedAt: event.target.value } : prev))}
              />
              <input
                value={pendingOffer.source || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, source: event.target.value } : prev))}
                placeholder="Source"
              />
              <input
                className="span-2"
                value={pendingOffer.sourceUrl || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, sourceUrl: event.target.value } : prev))}
                placeholder="Source URL"
              />
              <textarea
                className="span-2"
                value={pendingOffer.notes || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                placeholder="Notes"
              />
              <div className="modal-actions span-2">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setPendingOffer(null);
                    setPendingScrapedIndex(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={applyPendingChangesToScraped}
                  disabled={loading || pendingScrapedIndex === null}
                >
                  Update Scraped
                </button>
                <button type="submit" disabled={loading}>
                  Save To Database
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
