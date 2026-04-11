import { FormEvent, useEffect, useState } from "react";

type Offer = {
  id?: number;
  company: string;
  role: string;
  applied: boolean;
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

type ThemeMode = "auto" | "light" | "dark";
type AddOfferMode = "link" | "manual";

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultOffer(): Offer {
  return {
    company: "",
    role: "",
    applied: true,
    status: "applied",
    location: "",
    notes: "",
    appliedAt: getTodayDate(),
    source: "manual",
    sourceUrl: ""
  };
}

export function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerForm, setOfferForm] = useState<Offer>(createDefaultOffer);
  const [scrapeQuery, setScrapeQuery] = useState("frontend react");
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [pendingScrapedIndex, setPendingScrapedIndex] = useState<number | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [showStatus, setShowStatus] = useState(true);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [addOfferUrl, setAddOfferUrl] = useState("");
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [addOfferMode, setAddOfferMode] = useState<AddOfferMode>("link");
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem("themeMode");
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const isUrlMode = isAbsoluteHttpUrl(scrapeQuery.trim());
  const resolvedTheme = themeMode === "auto" ? (systemPrefersDark ? "dark" : "light") : themeMode;
  const statusText = loading ? "Working..." : message;
  const statusTone = loading
    ? "neutral"
    : /error|failed|invalid|http\s*\d+/i.test(message)
      ? "error"
      : "success";

  function setStatusMessage(nextMessage: string) {
    setMessage(nextMessage);
    setShowStatus(true);
  }

  function openAddOfferModal() {
    setShowAddOffer(true);
    setShowAddOfferForm(false);
    setAddOfferMode("link");
    setAddOfferUrl("");
    setOfferForm(createDefaultOffer());
    setShowUserMenu(false);
    setShowSettingsMenu(false);
  }

  function closeAddOfferModal() {
    setShowAddOffer(false);
    setShowAddOfferForm(false);
    setAddOfferUrl("");
  }

  function toggleAddOfferModal() {
    if (showAddOffer) {
      closeAddOfferModal();
      return;
    }
    openAddOfferModal();
  }

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
      .then(() => setStatusMessage("Data loaded"))
      .catch((error) => setStatusMessage(String(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("themeMode", themeMode);
    }
  }, [resolvedTheme, themeMode]);

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

      setOfferForm(createDefaultOffer());
      setAddOfferUrl("");
      setShowAddOfferForm(false);
      setShowAddOffer(false);
      await fetchOffers();
      setStatusMessage("Offer added");
    } catch (error) {
      setShowAddOfferForm(true);
      setOfferForm((prev) => ({
        ...prev,
        sourceUrl: addOfferUrl || prev.sourceUrl
      }));
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleScrapeAddOfferLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addOfferUrl.trim()) {
      setStatusMessage("Wklej link do oferty");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/scrape/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addOfferUrl })
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: {
          source?: string | null;
          title?: string | null;
          company?: string | null;
          location?: string | null;
          url?: string | null;
        };
      };
      if (!data.ok || !data.job) {
        throw new Error(data.error || "Nie udalo sie pobrac oferty");
      }

      setOfferForm((prev) => ({
        ...prev,
        company: data.job?.company || prev.company,
        role: data.job?.title || prev.role,
        location: data.job?.location || prev.location || "",
        source: data.job?.source || prev.source || "manual",
        sourceUrl: data.job?.url || addOfferUrl
      }));
      setShowAddOfferForm(true);
      setStatusMessage("Pobrano dane z linku, sprawdz i zapisz oferte");
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!excelFile) {
      setStatusMessage("Select .xlsx file first");
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
      setStatusMessage(`Excel imported: ${data.imported ?? 0}, skipped: ${data.skipped ?? 0}`);
    } catch (error) {
      setStatusMessage(String(error));
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
      setStatusMessage(`Scraped jobs: ${data.total ?? 0}`);

      if (data.mode === "link" && jobs[0]) {
        setPendingOffer({
          company: jobs[0].company || "Unknown company",
          role: jobs[0].title || "Unknown role",
          applied: true,
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
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function openSaveDialog(job: ScrapedJob, index: number) {
    setPendingOffer({
      company: job.company || "Unknown company",
      role: job.title || "Unknown role",
      applied: true,
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
    setStatusMessage("Scraped record updated");
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
      setStatusMessage("Scraped job saved to offers");
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    window.open("/api/offers/export-excel", "_blank");
  }

  return (
    <main className="app" id="top">
      <header className="header app-bar">
        <a className="brand brand-link" href="#top">
          ApplyManager
        </a>

        <nav className="top-nav" aria-label="Sekcje">
          <a href="#offers-list">Offers</a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="add-offer-btn"
            onClick={toggleAddOfferModal}
          >
            Dodaj
          </button>
          <div className="menu-wrap">
            <button
              type="button"
              className="ghost-btn icon-btn"
              onClick={() => {
                setShowSettingsMenu((prev) => !prev);
                setShowUserMenu(false);
              }}
              aria-label="Ustawienia"
            >
              ⚙
            </button>
            {showSettingsMenu ? (
              <div className="menu-panel">
                <label htmlFor="theme-select">Theme</label>
                <select
                  id="theme-select"
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                >
                  <option value="auto">Auto</option>
                  <option value="light">Jasny</option>
                  <option value="dark">Ciemny</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="menu-wrap">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setShowUserMenu((prev) => !prev);
                setShowSettingsMenu(false);
              }}
            >
              Uzytkownik
            </button>
            {showUserMenu ? (
              <div className="menu-panel">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={openAddOfferModal}
                >
                  Dodaj oferte
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowImportExcel((prev) => !prev);
                    setShowUserMenu(false);
                  }}
                >
                  {showImportExcel ? "Ukryj Import Excel" : "Pokaz Import Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportExcel();
                    setShowUserMenu(false);
                  }}
                >
                  Export Offers to Excel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showStatus ? (
        <p className={`status status--${statusTone}`}>
          <span>{statusText}</span>
          <button
            type="button"
            className="status-close"
            onClick={() => setShowStatus(false)}
            aria-label="Zamknij status"
          >
            X
          </button>
        </p>
      ) : null}

      {showImportExcel ? (
        <section className="card" id="import-excel">
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
      ) : null}

      <section className="card" id="offers-list">
        <h2>Offers ({offers.length})</h2>
        <div className="list">
          {offers.map((offer, index) => (
            <article className="item" key={`${offer.id || "offer"}-${index}`}>
              <div>
                <strong>
                  {offer.role} @ {offer.company}
                </strong>
                <p>
                  {offer.applied ? "applied" : "not applied"} | {offer.status} | {offer.location || "-"} | {offer.appliedAt || "-"} | {offer.source || "manual"}
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
          {offers.length === 0 ? <p className="hint">Nie masz jeszcze dodanych ofert.</p> : null}
        </div>
      </section>

      {showAddOffer ? (
        <div className="modal-backdrop">
          <div className="modal" id="add-offer">
            <button
              type="button"
              className="modal-close"
              onClick={closeAddOfferModal}
              aria-label="Zamknij okno dodawania oferty"
            >
              X
            </button>
            <h3>Dodaj Oferte</h3>
            <div className="row">
              <button
                type="button"
                className={addOfferMode === "link" ? "" : "ghost-btn"}
                onClick={() => {
                  setAddOfferMode("link");
                  setShowAddOfferForm(false);
                }}
              >
                Wklej link
              </button>
              <button
                type="button"
                className={addOfferMode === "manual" ? "" : "ghost-btn"}
                onClick={() => {
                  setAddOfferMode("manual");
                  setOfferForm((prev) => ({
                    ...prev,
                    source: prev.source || "manual",
                    sourceUrl: prev.sourceUrl || addOfferUrl || ""
                  }));
                }}
              >
                Manualnie
              </button>
            </div>

            {addOfferMode === "link" ? (
              <form className="row" onSubmit={handleScrapeAddOfferLink}>
                <input
                  value={addOfferUrl}
                  onChange={(event) => setAddOfferUrl(event.target.value)}
                  placeholder="Wklej link do oferty (np. pracuj.pl)"
                  required
                />
                <button type="submit" disabled={loading}>
                  Pobierz
                </button>
              </form>
            ) : (
              <p className="hint">Tryb manualny: uzupelnij pola ponizej i zapisz oferte.</p>
            )}

            {showAddOfferForm || addOfferMode === "manual" ? (
              <form className="grid" onSubmit={handleAddOffer}>
                <label className="form-field">
                  <span>Firma</span>
                  <input
                    value={offerForm.company}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, company: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Stanowisko</span>
                  <input
                    value={offerForm.role}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, role: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select
                    value={offerForm.status}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="applied">applied</option>
                    <option value="saved">saved</option>
                    <option value="interview">interview</option>
                    <option value="offer">offer</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <label className="form-field checkbox-field">
                  <span>Aplikowano</span>
                  <input
                    type="checkbox"
                    checked={offerForm.applied}
                    onChange={(event) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        applied: event.target.checked,
                        status: event.target.checked ? prev.status || "applied" : prev.status || "saved"
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Lokalizacja</span>
                  <input
                    value={offerForm.location || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Data aplikacji</span>
                  <input
                    type="date"
                    value={offerForm.appliedAt || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, appliedAt: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Źródło</span>
                  <input
                    value={offerForm.source || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, source: event.target.value }))}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Link oferty</span>
                  <input
                    value={offerForm.sourceUrl || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Notatki</span>
                  <textarea
                    value={offerForm.notes || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
                <div className="modal-actions span-2">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={closeAddOfferModal}
                    disabled={loading}
                  >
                    Zamknij
                  </button>
                  <button type="submit" disabled={loading}>
                    Dodaj oferte
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {pendingOffer ? (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setPendingOffer(null);
                setPendingScrapedIndex(null);
              }}
              aria-label="Zamknij okno zapisu oferty"
            >
              X
            </button>
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
              <label>
                <input
                  type="checkbox"
                  checked={pendingOffer.applied}
                  onChange={(event) =>
                    setPendingOffer((prev) =>
                      prev
                        ? {
                            ...prev,
                            applied: event.target.checked,
                            status: event.target.checked ? prev.status || "applied" : prev.status || "saved"
                          }
                        : prev
                    )
                  }
                />
                Aplikowano
              </label>
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
