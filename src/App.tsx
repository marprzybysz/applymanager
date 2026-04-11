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
  employmentTypes?: string[] | null;
  workTime?: string | null;
  workMode?: string | null;
  shiftCount?: string | null;
  workingHours?: string | null;
};

type ScrapedJob = {
  source: string;
  title: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  datePosted: string | null;
  employmentTypes?: string[] | null;
  workTime?: string | null;
  workMode?: string | null;
  shiftCount?: string | null;
  workingHours?: string | null;
};

type UserPreferences = {
  preferredContractTypes: string[];
  preferredWorkTimes: string[];
  preferredWorkModes: string[];
  preferredShiftCounts: string[];
  preferredWorkingHours: string;
};

type ThemeMode = "auto" | "light" | "dark";
type AddOfferMode = "link" | "manual";
type Language = "pl" | "en";

const I18N = {
  pl: {
    ready: "Gotowe",
    working: "Przetwarzanie...",
    dataLoaded: "Dane zaladowane",
    addOffer: "Dodaj",
    offers: "Oferty",
    user: "Uzytkownik",
    settings: "Ustawienia",
    theme: "Motyw",
    language: "Jezyk",
    hideImport: "Ukryj Import Excel",
    showImport: "Pokaz Import Excel",
    exportExcel: "Eksportuj Oferty do Excel",
    preferences: "Preferencje",
    savePreferences: "Zapisz preferencje",
    preferencesSaved: "Preferencje zapisane",
    preferencesLoadFailed: "Nie udalo sie pobrac preferencji",
    preferencesSaveFailed: "Nie udalo sie zapisac preferencji",
    contractTypes: "Typ umowy",
    workTimes: "Czas pracy",
    workModes: "Forma pracy",
    shiftCounts: "Ilosc zmian",
    workHoursRange: "Zakres czasu pracy",
    importExcel: "Import Excel",
    import: "Import",
    noOffers: "Nie masz jeszcze dodanych ofert.",
    close: "Zamknij",
    addOfferTitle: "Dodaj Oferte",
    pasteLink: "Wklej link",
    manual: "Manualnie",
    fetch: "Pobierz",
    manualHint: "Tryb manualny: uzupelnij pola ponizej i zapisz oferte.",
    company: "Firma",
    role: "Stanowisko",
    status: "Status",
    applied: "Aplikowano",
    location: "Lokalizacja",
    appliedAt: "Data aplikacji",
    source: "Zrodlo",
    offerLink: "Link oferty",
    notes: "Notatki",
    addOfferSubmit: "Dodaj oferte",
    copiedLinkRequired: "Wklej link do oferty",
    offerAddFailed: "Nie udalo sie dodac oferty",
    linkFetchFailed: "Nie udalo sie pobrac oferty",
    linkFetched: "Pobrano dane z linku, sprawdz i zapisz oferte",
    offerAdded: "Oferta dodana",
    fileFirst: "Najpierw wybierz plik .xlsx",
    excelImportFailed: "Import Excel nie powiodl sie",
    excelImported: "Zaimportowano z Excela: {imported}, pominieto: {skipped}",
    scrapeFailed: "Scraping nie powiodl sie",
    scrapedJobs: "Zescrapowane oferty: {total}",
    scrapedUpdated: "Zaktualizowano rekord zescrapowany",
    saveScrapedFailed: "Nie udalo sie zapisac zescrapowanej oferty",
    scrapedSaved: "Zescrapowana oferta zapisana",
    failedFetchOffers: "Nie udalo sie pobrac ofert",
    fetchLinkPlaceholder: "Wklej link do oferty (np. pracuj.pl)",
    supportedColumns:
      "Obslugiwane kolumny: Firma, Stanowisko, Lokalizacja, Status, Data aplikacji, Notatki, Hyperlink (lub warianty company/role/date/url).",
    yesApplied: "applied",
    noApplied: "not applied"
  },
  en: {
    ready: "Ready",
    working: "Working...",
    dataLoaded: "Data loaded",
    addOffer: "Add",
    offers: "Offers",
    user: "User",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    hideImport: "Hide Excel Import",
    showImport: "Show Excel Import",
    exportExcel: "Export Offers to Excel",
    preferences: "Preferences",
    savePreferences: "Save preferences",
    preferencesSaved: "Preferences saved",
    preferencesLoadFailed: "Failed to fetch preferences",
    preferencesSaveFailed: "Failed to save preferences",
    contractTypes: "Contract types",
    workTimes: "Working time",
    workModes: "Work mode",
    shiftCounts: "Shifts count",
    workHoursRange: "Working hours range",
    importExcel: "Import Excel",
    import: "Import",
    noOffers: "You don't have any offers yet.",
    close: "Close",
    addOfferTitle: "Add Offer",
    pasteLink: "Paste Link",
    manual: "Manual",
    fetch: "Fetch",
    manualHint: "Manual mode: fill in fields below and save the offer.",
    company: "Company",
    role: "Role",
    status: "Status",
    applied: "Applied",
    location: "Location",
    appliedAt: "Application date",
    source: "Source",
    offerLink: "Offer URL",
    notes: "Notes",
    addOfferSubmit: "Add offer",
    copiedLinkRequired: "Paste offer URL first",
    offerAddFailed: "Failed to add offer",
    linkFetchFailed: "Failed to fetch offer from URL",
    linkFetched: "Fetched data from URL, review and save the offer",
    offerAdded: "Offer added",
    fileFirst: "Select .xlsx file first",
    excelImportFailed: "Excel import failed",
    excelImported: "Excel imported: {imported}, skipped: {skipped}",
    scrapeFailed: "Scrape failed",
    scrapedJobs: "Scraped jobs: {total}",
    scrapedUpdated: "Scraped record updated",
    saveScrapedFailed: "Failed to save scraped job",
    scrapedSaved: "Scraped job saved to offers",
    failedFetchOffers: "Failed to fetch offers",
    fetchLinkPlaceholder: "Paste offer URL (e.g. pracuj.pl)",
    supportedColumns:
      "Supported columns: Firma, Stanowisko, Lokalizacja, Status, Data aplikacji, Notatki, Hyperlink (or company/role/date/url variants).",
    yesApplied: "applied",
    noApplied: "not applied"
  }
} as const;

const CONTRACT_TYPES = [
  "umowa o pracę",
  "umowa b2b",
  "umowa zlecenie",
  "umowa o dzieło",
  "umowa agencyjna",
  "samozatrudnienie",
];
const WORK_TIMES = ["pełny etat", "pół etatu"];
const WORK_MODES = ["stacjonarna", "hybrydowa", "zdalna"];
const SHIFT_COUNTS = ["jedna zmiana", "dwie zmiany", "trzy zmiany"];

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
    sourceUrl: "",
    employmentTypes: [],
    workTime: "",
    workMode: "",
    shiftCount: "",
    workingHours: "",
  };
}

function createDefaultPreferences(): UserPreferences {
  return {
    preferredContractTypes: [],
    preferredWorkTimes: [],
    preferredWorkModes: [],
    preferredShiftCounts: [],
    preferredWorkingHours: "",
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
  const [message, setMessage] = useState("");
  const [showStatus, setShowStatus] = useState(true);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [addOfferUrl, setAddOfferUrl] = useState("");
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [addOfferMode, setAddOfferMode] = useState<AddOfferMode>("link");
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(createDefaultPreferences);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem("themeMode");
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "pl";
    const stored = window.localStorage.getItem("language");
    return stored === "pl" || stored === "en" ? stored : "pl";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const isUrlMode = isAbsoluteHttpUrl(scrapeQuery.trim());
  const resolvedTheme = themeMode === "auto" ? (systemPrefersDark ? "dark" : "light") : themeMode;
  const t = I18N[language];
  const statusText = loading ? t.working : message || t.ready;
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
      throw new Error(data.error || t.failedFetchOffers);
    }
    setOffers(data.offers || []);
  }

  async function fetchPreferences() {
    const response = await fetch("/api/preferences");
    const data = (await response.json()) as {
      ok: boolean;
      preferences?: Partial<UserPreferences>;
      error?: string;
    };
    if (!data.ok) {
      throw new Error(data.error || t.preferencesLoadFailed);
    }

    const prefs = data.preferences || {};
    setPreferences({
      preferredContractTypes: Array.isArray(prefs.preferredContractTypes) ? prefs.preferredContractTypes : [],
      preferredWorkTimes: Array.isArray(prefs.preferredWorkTimes) ? prefs.preferredWorkTimes : [],
      preferredWorkModes: Array.isArray(prefs.preferredWorkModes) ? prefs.preferredWorkModes : [],
      preferredShiftCounts: Array.isArray(prefs.preferredShiftCounts) ? prefs.preferredShiftCounts : [],
      preferredWorkingHours: String(prefs.preferredWorkingHours || ""),
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffers(), fetchPreferences()])
      .then(() => setStatusMessage(t.dataLoaded))
      .catch((error) => setStatusMessage(String(error)))
      .finally(() => setLoading(false));
  }, [language]);

  function handleSingleSelectChange(field: keyof Omit<UserPreferences, "preferredWorkingHours">, value: string) {
    setPreferences((prev) => ({
      ...prev,
      [field]: value ? [value] : [],
    }));
  }

  async function handleSavePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || t.preferencesSaveFailed);
      }
      setStatusMessage(t.preferencesSaved);
      setShowPreferences(false);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("language", language);
  }, [language]);

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
        throw new Error(data.error || t.offerAddFailed);
      }

      setOfferForm(createDefaultOffer());
      setAddOfferUrl("");
      setShowAddOfferForm(false);
      setShowAddOffer(false);
      await fetchOffers();
      setStatusMessage(t.offerAdded);
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
      setStatusMessage(t.copiedLinkRequired);
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
          employmentTypes?: string[] | null;
          workTime?: string | null;
          workMode?: string | null;
          shiftCount?: string | null;
          workingHours?: string | null;
        };
      };
      if (!data.ok || !data.job) {
        throw new Error(data.error || t.linkFetchFailed);
      }

      setOfferForm((prev) => ({
        ...prev,
        company: data.job?.company || prev.company,
        role: data.job?.title || prev.role,
        location: data.job?.location || prev.location || "",
        source: data.job?.source || prev.source || "manual",
        sourceUrl: data.job?.url || addOfferUrl,
        employmentTypes: data.job?.employmentTypes || prev.employmentTypes || [],
        workTime: data.job?.workTime || prev.workTime || "",
        workMode: data.job?.workMode || prev.workMode || "",
        shiftCount: data.job?.shiftCount || prev.shiftCount || "",
        workingHours: data.job?.workingHours || prev.workingHours || "",
      }));
      setShowAddOfferForm(true);
      setStatusMessage(t.linkFetched);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!excelFile) {
      setStatusMessage(t.fileFirst);
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
        throw new Error(data.error || t.excelImportFailed);
      }

      await fetchOffers();
      setExcelFile(null);
      setStatusMessage(
        t.excelImported
          .replace("{imported}", String(data.imported ?? 0))
          .replace("{skipped}", String(data.skipped ?? 0))
      );
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
        throw new Error(data.error || t.scrapeFailed);
      }

      const jobs = data.jobs || [];
      setScrapedJobs(jobs);
      setStatusMessage(t.scrapedJobs.replace("{total}", String(data.total ?? 0)));

      if (data.mode === "link" && jobs[0]) {
        setPendingOffer({
          company: jobs[0].company || t.company,
          role: jobs[0].title || t.role,
          applied: true,
          status: "applied",
          location: jobs[0].location,
          notes: "",
          appliedAt: new Date().toISOString().slice(0, 10),
          source: jobs[0].source,
          sourceUrl: jobs[0].url,
          employmentTypes: jobs[0].employmentTypes || [],
          workTime: jobs[0].workTime || "",
          workMode: jobs[0].workMode || "",
          shiftCount: jobs[0].shiftCount || "",
          workingHours: jobs[0].workingHours || "",
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
      company: job.company || t.company,
      role: job.title || t.role,
      applied: true,
      status: "applied",
      location: job.location,
      notes: "",
      appliedAt: new Date().toISOString().slice(0, 10),
      source: job.source,
      sourceUrl: job.url,
      employmentTypes: job.employmentTypes || [],
      workTime: job.workTime || "",
      workMode: job.workMode || "",
      shiftCount: job.shiftCount || "",
      workingHours: job.workingHours || "",
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
    setStatusMessage(t.scrapedUpdated);
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
        throw new Error(data.error || t.saveScrapedFailed);
      }

      await fetchOffers();
      setPendingOffer(null);
      setPendingScrapedIndex(null);
      setStatusMessage(t.scrapedSaved);
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
          <a href="#offers-list">{t.offers}</a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="add-offer-btn"
            onClick={toggleAddOfferModal}
          >
            {t.addOffer}
          </button>
          <div className="menu-wrap">
            <button
              type="button"
              className="ghost-btn icon-btn"
              onClick={() => {
                setShowSettingsMenu((prev) => !prev);
                setShowUserMenu(false);
              }}
              aria-label={t.settings}
            >
              ⚙
            </button>
            {showSettingsMenu ? (
              <div className="menu-panel">
                <label htmlFor="theme-select">{t.theme}</label>
                <select
                  id="theme-select"
                  value={themeMode}
                  onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                >
                  <option value="auto">Auto</option>
                  <option value="light">Jasny</option>
                  <option value="dark">Ciemny</option>
                </select>
                <label htmlFor="language-select">{t.language}</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
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
              {t.user}
            </button>
            {showUserMenu ? (
              <div className="menu-panel">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={openAddOfferModal}
                >
                  {t.addOfferTitle}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowImportExcel((prev) => !prev);
                    setShowUserMenu(false);
                  }}
                >
                  {showImportExcel ? t.hideImport : t.showImport}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowPreferences(true);
                    setShowUserMenu(false);
                  }}
                >
                  {t.preferences}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportExcel();
                    setShowUserMenu(false);
                  }}
                >
                  {t.exportExcel}
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
            aria-label={t.close}
          >
            X
          </button>
        </p>
      ) : null}

      {showImportExcel ? (
        <section className="card" id="import-excel">
          <h2>{t.importExcel}</h2>
          <form className="row" onSubmit={handleImportExcel}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
            />
            <button type="submit" disabled={loading}>
              {t.import}
            </button>
          </form>
          <p className="hint">{t.supportedColumns}</p>
        </section>
      ) : null}

      <section className="card" id="offers-list">
        <h2>{t.offers} ({offers.length})</h2>
        <div className="list">
          {offers.map((offer, index) => (
            <article className="item" key={`${offer.id || "offer"}-${index}`}>
              <div>
                <strong>
                  {offer.role} @ {offer.company}
                </strong>
                <p>
                  {offer.applied ? t.yesApplied : t.noApplied} | {offer.status} | {offer.location || "-"} | {offer.appliedAt || "-"} | {offer.source || "manual"}
                </p>
                {offer.sourceUrl ? (
                  <a href={offer.sourceUrl} target="_blank" rel="noreferrer">
                    {offer.sourceUrl}
                  </a>
                ) : null}
                {offer.notes ? <p>{offer.notes}</p> : null}
                {offer.employmentTypes?.length || offer.workTime || offer.workMode || offer.shiftCount || offer.workingHours ? (
                  <p>
                    {(offer.employmentTypes || []).join(", ") || "-"} | {offer.workTime || "-"} | {offer.workMode || "-"} | {offer.shiftCount || "-"} | {offer.workingHours || "-"}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
          {offers.length === 0 ? <p className="hint">{t.noOffers}</p> : null}
        </div>
      </section>

      {showAddOffer ? (
        <div className="modal-backdrop">
          <div className="modal" id="add-offer">
            <button
              type="button"
              className="modal-close"
              onClick={closeAddOfferModal}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.addOfferTitle}</h3>
            <div className="row">
              <button
                type="button"
                className={addOfferMode === "link" ? "" : "ghost-btn"}
                onClick={() => {
                  setAddOfferMode("link");
                  setShowAddOfferForm(false);
                }}
              >
                {t.pasteLink}
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
                {t.manual}
              </button>
            </div>

            {addOfferMode === "link" ? (
              <form className="row" onSubmit={handleScrapeAddOfferLink}>
                <input
                  value={addOfferUrl}
                  onChange={(event) => setAddOfferUrl(event.target.value)}
                  placeholder={t.fetchLinkPlaceholder}
                  required
                />
                <button type="submit" disabled={loading}>
                  {t.fetch}
                </button>
              </form>
            ) : (
              <p className="hint">{t.manualHint}</p>
            )}

            {showAddOfferForm || addOfferMode === "manual" ? (
              <form className="grid" onSubmit={handleAddOffer}>
                <label className="form-field">
                  <span>{t.company}</span>
                  <input
                    value={offerForm.company}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, company: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>{t.role}</span>
                  <input
                    value={offerForm.role}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, role: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>{t.status}</span>
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
                  <span>{t.applied}</span>
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
                  <span>{t.location}</span>
                  <input
                    value={offerForm.location || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>{t.appliedAt}</span>
                  <input
                    type="date"
                    value={offerForm.appliedAt || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, appliedAt: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>{t.source}</span>
                  <input
                    value={offerForm.source || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, source: event.target.value }))}
                  />
                </label>
                <label className="form-field span-2">
                  <span>{t.offerLink}</span>
                  <input
                    value={offerForm.sourceUrl || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                  />
                </label>
                <label className="form-field span-2">
                  <span>{t.notes}</span>
                  <textarea
                    value={offerForm.notes || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </label>
                <label className="form-field span-2">
                  <span>{t.contractTypes}</span>
                  <input
                    value={(offerForm.employmentTypes || []).join(", ")}
                    onChange={(event) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        employmentTypes: event.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="umowa o pracę, umowa b2b"
                  />
                </label>
                <label className="form-field">
                  <span>{t.workTimes}</span>
                  <input
                    value={offerForm.workTime || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, workTime: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>{t.workModes}</span>
                  <input
                    value={offerForm.workMode || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, workMode: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>{t.shiftCounts}</span>
                  <input
                    value={offerForm.shiftCount || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, shiftCount: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>{t.workHoursRange}</span>
                  <input
                    value={offerForm.workingHours || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, workingHours: event.target.value }))}
                    placeholder="08:00-16:00"
                  />
                </label>
                <div className="modal-actions span-2">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={closeAddOfferModal}
                    disabled={loading}
                  >
                    {t.close}
                  </button>
                  <button type="submit" disabled={loading}>
                    {t.addOfferSubmit}
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

      {showPreferences ? (
        <div className="modal-backdrop">
          <div className="modal" id="preferences-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowPreferences(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.preferences}</h3>
            <form className="grid" onSubmit={handleSavePreferences}>
              <label className="form-field span-2">
                <span>{t.contractTypes}</span>
                <select
                  value={preferences.preferredContractTypes[0] || ""}
                  onChange={(event) =>
                    handleSingleSelectChange("preferredContractTypes", event.target.value)
                  }
                >
                  <option value="">-</option>
                  {CONTRACT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field span-2">
                <span>{t.workTimes}</span>
                <select
                  value={preferences.preferredWorkTimes[0] || ""}
                  onChange={(event) =>
                    handleSingleSelectChange("preferredWorkTimes", event.target.value)
                  }
                >
                  <option value="">-</option>
                  {WORK_TIMES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field span-2">
                <span>{t.workModes}</span>
                <select
                  value={preferences.preferredWorkModes[0] || ""}
                  onChange={(event) =>
                    handleSingleSelectChange("preferredWorkModes", event.target.value)
                  }
                >
                  <option value="">-</option>
                  {WORK_MODES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field span-2">
                <span>{t.shiftCounts}</span>
                <select
                  value={preferences.preferredShiftCounts[0] || ""}
                  onChange={(event) =>
                    handleSingleSelectChange("preferredShiftCounts", event.target.value)
                  }
                >
                  <option value="">-</option>
                  {SHIFT_COUNTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field span-2">
                <span>{t.workHoursRange}</span>
                <input
                  value={preferences.preferredWorkingHours}
                  onChange={(event) =>
                    setPreferences((prev) => ({ ...prev, preferredWorkingHours: event.target.value }))
                  }
                  placeholder="np. 08:00-16:00"
                />
              </label>

              <div className="modal-actions span-2">
                <button type="button" className="ghost-btn" onClick={() => setShowPreferences(false)} disabled={loading}>
                  {t.close}
                </button>
                <button type="submit" disabled={loading}>
                  {t.savePreferences}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
