import { FormEvent, useEffect, useMemo, useState } from "react";

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
  const [limitPerSource, setLimitPerSource] = useState(10);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready");

  const sourceToggleLabel = useMemo(
    () =>
      selectedSources.length === 0
        ? "all"
        : `${selectedSources.length}/${sources.length} selected`,
    [selectedSources.length, sources.length]
  );

  async function fetchOffers() {
    const response = await fetch("/api/offers");
    const data = (await response.json()) as { ok: boolean; offers?: Offer[]; error?: string };
    if (!data.ok) {
      throw new Error(data.error || "Failed to fetch offers");
    }
    setOffers(data.offers || []);
  }

  async function fetchSources() {
    const response = await fetch("/api/scrape/sources");
    const data = (await response.json()) as { sources: string[] };
    setSources(data.sources || []);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffers(), fetchSources()])
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
          query: scrapeQuery,
          sources: selectedSources,
          limitPerSource
        })
      });

      const data = (await response.json()) as { ok: boolean; jobs?: ScrapedJob[]; total?: number; error?: string };
      if (!data.ok) {
        throw new Error(data.error || "Scrape failed");
      }

      setScrapedJobs(data.jobs || []);
      setMessage(`Scraped jobs: ${data.total ?? 0}`);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveScrapedJob(job: ScrapedJob) {
    setLoading(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: job.company || "Unknown company",
          role: job.title || "Unknown role",
          status: "applied",
          location: job.location,
          source: job.source,
          sourceUrl: job.url,
          appliedAt: new Date().toISOString().slice(0, 10)
        })
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || "Failed to save scraped job");
      }

      await fetchOffers();
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

  function toggleSource(source: string) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]
    );
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
        <p className="hint">Supported columns: company/firma, role/stanowisko, status, location, notes, date, source, url.</p>
      </section>

      <section className="card">
        <h2>Scrape Jobs</h2>
        <form className="grid" onSubmit={handleScrape}>
          <input
            className="span-2"
            value={scrapeQuery}
            onChange={(event) => setScrapeQuery(event.target.value)}
            placeholder="Search phrase OR offer URL (e.g. https://www.pracuj.pl/...)"
            required
          />
          <input
            type="number"
            min={1}
            max={50}
            value={limitPerSource}
            onChange={(event) => setLimitPerSource(Number(event.target.value || 10))}
          />
          <div className="pill span-1">Sources: {sourceToggleLabel}</div>
          <div className="sources span-2">
            {sources.map((source) => (
              <label key={source}>
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                <span>{source}</span>
              </label>
            ))}
          </div>
          <button className="span-2" type="submit" disabled={loading}>
            Scrape
          </button>
        </form>
        <p className="hint">Supported URL domains: pracuj.pl, olx.pl, nofluffjobs.com, rocketjobs.pl, indeed, justjoin.it</p>

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
              <button type="button" onClick={() => saveScrapedJob(job)} disabled={loading}>
                Save
              </button>
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
    </main>
  );
}
