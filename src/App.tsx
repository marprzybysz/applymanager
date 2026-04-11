import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Offer = {
  id?: number;
  company: string;
  role: string;
  applied: boolean;
  status: string;
  location?: string | null;
  notes?: string | null;
  appliedAt?: string | null;
  datePosted?: string | null;
  expiresAt?: string | null;
  daysToExpire?: number | null;
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
  expiresAt?: string | null;
  daysToExpire?: number | null;
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

type OfferStats = {
  totalOffers: number;
  appliedOffers: number;
  activeOffers: number;
  expiredOffers: number;
  averageDaysLeft: number | null;
  recentApplications7d: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
};

type ThemeMode = "auto" | "light" | "dark";
type AddOfferMode = "link" | "manual";
type Language = "pl" | "en";
type ImportTarget = "offers" | "preferences";
type ImportFormat = "xlsx" | "json";
type ExportTarget = "offers" | "preferences" | "all";
type ExportFormat = "xlsx" | "json";
type TopTab = "offers" | "stats";
type PeriodFilter = "all" | "month" | "quarter" | "year";
type SortDirection = "none" | "asc" | "desc";
type SortType = "text" | "date" | "number";
type SortColumn =
  | "role"
  | "company"
  | "status"
  | "location"
  | "appliedAt"
  | "datePosted"
  | "expiresAt"
  | "daysToExpire"
  | "source";
type StatusTone = "blue" | "yellow" | "green" | "red" | "neutral";

const I18N = {
  pl: {
    ready: "Gotowe",
    working: "Przetwarzanie...",
    dataLoaded: "Dane zaladowane",
    addOffer: "Dodaj",
    offers: "Oferty",
    stats: "Statystyki",
    user: "Uzytkownik",
    settings: "Ustawienia",
    importMenu: "Import",
    exportMenu: "Export",
    dataToImport: "Co importowac",
    dataToExport: "Co eksportowac",
    fileFormat: "Format pliku",
    offersOnly: "Oferty",
    preferencesOnly: "Preferencje",
    allData: "Wszystkie dane",
    importData: "Importuj dane",
    exportData: "Eksportuj dane",
    unsupportedImportCombo: "Ten typ importu nie jest obslugiwany",
    unsupportedExportCombo: "Ten typ eksportu nie jest obslugiwany",
    importSuccess: "Import zakonczony",
    exportSuccess: "Eksport przygotowany",
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
    failedFetchStats: "Nie udalo sie pobrac statystyk",
    totalOffers: "Wszystkie oferty",
    appliedOffers: "Zaaplikowane",
    activeOffers: "Aktywne",
    expiredOffers: "Wygasle",
    avgDaysLeft: "Srednia dni do konca",
    recentApplications: "Aplikacje (7 dni)",
    statusBreakdown: "Statusy",
    sourceBreakdown: "Zrodla",
    fetchLinkPlaceholder: "Wklej link do oferty (np. pracuj.pl)",
    supportedColumns:
      "Obslugiwane kolumny: Firma, Stanowisko, Lokalizacja, Status, Data aplikacji, Notatki, Hyperlink (lub warianty company/role/date/url).",
    yesApplied: "applied",
    noApplied: "not applied",
    viewMode: "Widok",
    viewCompact: "Prosty",
    viewFull: "Zaawansowany",
    filters: "Filtry",
    search: "Szukaj",
    all: "Wszystkie",
    noFilterResults: "Brak wynikow dla aktualnych filtrow.",
    filterByStatus: "Filtr statusu",
    filterBySource: "Filtr zrodla",
    filterByPeriod: "Zakres czasu",
    periodAll: "Wszystko",
    periodMonth: "Tylko ten miesiac",
    periodQuarter: "Tylko ten kwartal",
    periodYear: "Tylko ten rok",
    clearFilters: "Wyczysc filtry",
    offerDetails: "Szczegoly oferty",
    edit: "Edytuj",
    save: "Zapisz",
    delete: "Usun",
    cancel: "Anuluj",
    confirmDeleteTitle: "Potwierdzenie usuniecia",
    confirmDeleteText: "Czy na pewno chcesz usunac:",
    confirmDeleteYes: "Tak",
    confirmDeleteNo: "Nie",
    deleted: "Oferta usunieta",
    updated: "Oferta zaktualizowana",
    deleteConfirm: "Czy na pewno chcesz usunac te oferte?"
  },
  en: {
    ready: "Ready",
    working: "Working...",
    dataLoaded: "Data loaded",
    addOffer: "Add",
    offers: "Offers",
    stats: "Stats",
    user: "User",
    settings: "Settings",
    importMenu: "Import",
    exportMenu: "Export",
    dataToImport: "What to import",
    dataToExport: "What to export",
    fileFormat: "File format",
    offersOnly: "Offers",
    preferencesOnly: "Preferences",
    allData: "All data",
    importData: "Import data",
    exportData: "Export data",
    unsupportedImportCombo: "This import type is not supported",
    unsupportedExportCombo: "This export type is not supported",
    importSuccess: "Import completed",
    exportSuccess: "Export prepared",
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
    failedFetchStats: "Failed to fetch stats",
    totalOffers: "Total offers",
    appliedOffers: "Applied",
    activeOffers: "Active",
    expiredOffers: "Expired",
    avgDaysLeft: "Average days left",
    recentApplications: "Applications (7d)",
    statusBreakdown: "Statuses",
    sourceBreakdown: "Sources",
    fetchLinkPlaceholder: "Paste offer URL (e.g. pracuj.pl)",
    supportedColumns:
      "Supported columns: Firma, Stanowisko, Lokalizacja, Status, Data aplikacji, Notatki, Hyperlink (or company/role/date/url variants).",
    yesApplied: "applied",
    noApplied: "not applied",
    viewMode: "View",
    viewCompact: "Simple",
    viewFull: "Advanced",
    filters: "Filters",
    search: "Search",
    all: "All",
    noFilterResults: "No results for current filters.",
    filterByStatus: "Filter by status",
    filterBySource: "Filter by source",
    filterByPeriod: "Time range",
    periodAll: "All",
    periodMonth: "This month",
    periodQuarter: "This quarter",
    periodYear: "This year",
    clearFilters: "Clear filters",
    offerDetails: "Offer details",
    edit: "Edit",
    save: "Save",
    delete: "Delete",
    cancel: "Cancel",
    confirmDeleteTitle: "Delete confirmation",
    confirmDeleteText: "Are you sure you want to delete:",
    confirmDeleteYes: "Yes",
    confirmDeleteNo: "No",
    deleted: "Offer deleted",
    updated: "Offer updated",
    deleteConfirm: "Are you sure you want to delete this offer?"
  }
} as const;

const CONTRACT_TYPES = [
  "dowolny",
  "umowa o pracę",
  "umowa b2b",
  "umowa zlecenie",
  "umowa o dzieło",
  "umowa agencyjna",
  "samozatrudnienie",
];
const WORK_TIMES = ["dowolny", "pełny etat", "pół etatu"];
const WORK_MODES = ["dowolny", "stacjonarna", "hybrydowa", "zdalna"];
const SHIFT_COUNTS = ["dowolny", "jedna zmiana", "dwie zmiany", "trzy zmiany"];
const WORKING_HOURS_OPTIONS = ["dowolny", "6-14", "14-22", "22-6"];

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
    datePosted: "",
    expiresAt: "",
    daysToExpire: null,
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

function createDefaultStats(): OfferStats {
  return {
    totalOffers: 0,
    appliedOffers: 0,
    activeOffers: 0,
    expiredOffers: 0,
    averageDaysLeft: null,
    recentApplications7d: 0,
    statusCounts: {},
    sourceCounts: {},
  };
}

function parseWorkingHoursSelection(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function serializeWorkingHoursSelection(values: string[]): string {
  return values.join(", ");
}

function normalizeDateForInput(value: string | null | undefined): string {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const dotted = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotted) {
    const day = dotted[1].padStart(2, "0");
    const month = dotted[2].padStart(2, "0");
    const year = dotted[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return "";
}

function normalizeOfferForEdit(offer: Offer): Offer {
  return {
    ...offer,
    company: String(offer.company || ""),
    role: String(offer.role || ""),
    status: String(offer.status || "saved"),
    location: offer.location || "",
    notes: offer.notes || "",
    appliedAt: normalizeDateForInput(offer.appliedAt),
    datePosted: normalizeDateForInput(offer.datePosted),
    expiresAt: normalizeDateForInput(offer.expiresAt),
    source: offer.source || "",
    sourceUrl: offer.sourceUrl || "",
    employmentTypes: [...(offer.employmentTypes || [])],
    workTime: offer.workTime || "",
    workMode: offer.workMode || "",
    shiftCount: offer.shiftCount || "",
    workingHours: offer.workingHours || "",
  };
}

function inferAppliedFromStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized !== "saved";
}

export function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerForm, setOfferForm] = useState<Offer>(createDefaultOffer);
  const [scrapeQuery, setScrapeQuery] = useState("frontend react");
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [pendingScrapedIndex, setPendingScrapedIndex] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showStatus, setShowStatus] = useState(true);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [addOfferUrl, setAddOfferUrl] = useState("");
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [addOfferMode, setAddOfferMode] = useState<AddOfferMode>("link");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importTarget, setImportTarget] = useState<ImportTarget>("offers");
  const [importFormat, setImportFormat] = useState<ImportFormat>("xlsx");
  const [exportTarget, setExportTarget] = useState<ExportTarget>("offers");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(createDefaultPreferences);
  const [stats, setStats] = useState<OfferStats>(createDefaultStats);
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("offers");
  const [compactView, setCompactView] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedOfferDraft, setSelectedOfferDraft] = useState<Offer | null>(null);
  const [editingSelectedOffer, setEditingSelectedOffer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dockOfferToolsToHeader, setDockOfferToolsToHeader] = useState(false);
  const offersToolbarRef = useRef<HTMLDivElement | null>(null);
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
  const isSelectedOfferDirty = useMemo(() => {
    if (!editingSelectedOffer || !selectedOffer || !selectedOfferDraft) return false;
    const baseline = JSON.stringify(normalizeOfferForEdit(selectedOffer));
    const current = JSON.stringify(normalizeOfferForEdit(selectedOfferDraft));
    return baseline !== current;
  }, [editingSelectedOffer, selectedOffer, selectedOfferDraft]);

  function setStatusMessage(nextMessage: string) {
    setMessage(nextMessage);
    setShowStatus(true);
  }

  const statusFilterOptions = useMemo(
    () =>
      Array.from(new Set(offers.map((offer) => offer.status).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
      ),
    [offers]
  );

  const sourceFilterOptions = useMemo(
    () =>
      Array.from(new Set(offers.map((offer) => offer.source || "manual").filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
      ),
    [offers]
  );

  function toggleSort(nextColumn: SortColumn, type: SortType) {
    const cycle: SortDirection[] = type === "date" ? ["desc", "asc", "none"] : ["asc", "desc", "none"];
    if (sortColumn !== nextColumn) {
      setSortColumn(nextColumn);
      setSortDirection(cycle[0]);
      return;
    }
    const index = cycle.indexOf(sortDirection);
    const nextDirection = cycle[(index + 1) % cycle.length];
    if (nextDirection === "none") {
      setSortColumn(null);
      setSortDirection("none");
      return;
    }
    setSortDirection(nextDirection);
  }

  function getSortValue(offer: Offer, column: SortColumn) {
    if (column === "daysToExpire") return offer.daysToExpire ?? Number.MAX_SAFE_INTEGER;
    if (column === "appliedAt" || column === "datePosted" || column === "expiresAt") {
      const raw = offer[column];
      return raw ? Date.parse(raw) || 0 : 0;
    }
    const raw = offer[column];
    return String(raw || "").toLowerCase();
  }

  function getSortIndicator(column: SortColumn) {
    if (sortColumn !== column || sortDirection === "none") return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function getOfferStatusTone(status: string | null | undefined): StatusTone {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return "neutral";

    if (["wysłano", "wyslano", "applied", "saved"].includes(normalized)) {
      return "blue";
    }
    if (
      [
        "interview",
        "in progress",
        "odczytana",
        "odczytane",
        "odczytano",
        "w trakcie",
        "proces",
        "?",
      ].includes(normalized)
    ) {
      return "yellow";
    }
    if (["offer", "umowienie na rozmowe", "umówienie na rozmowę", "rozmowa", "rozmowa umowiona"].includes(normalized)) {
      return "green";
    }
    if (
      normalized.includes("rejected") ||
      normalized.includes("odrzu") ||
      normalized.includes("odmow")
    ) {
      return "red";
    }
    return "neutral";
  }

  function resolveOfferPeriodDate(offer: Offer) {
    return offer.appliedAt || offer.datePosted || null;
  }

  function matchesPeriodFilter(offer: Offer, period: PeriodFilter) {
    if (period === "all") return true;
    const raw = resolveOfferPeriodDate(offer);
    if (!raw) return false;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    if (period === "year") {
      return date.getFullYear() === currentYear;
    }
    if (period === "month") {
      return date.getFullYear() === currentYear && date.getMonth() === now.getMonth();
    }

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const dateQuarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
    return date.getFullYear() === currentYear && dateQuarterStartMonth === quarterStartMonth;
  }

  const visibleOffers = useMemo(() => {
    const textQuery = filterText.trim().toLowerCase();
    const filtered = offers.filter((offer) => {
      if (filterStatus !== "all" && (offer.status || "") !== filterStatus) return false;
      if (filterSource !== "all" && (offer.source || "manual") !== filterSource) return false;
      if (!matchesPeriodFilter(offer, filterPeriod)) return false;
      if (!textQuery) return true;

      const haystack = [
        offer.role,
        offer.company,
        offer.location,
        offer.notes,
        offer.status,
        offer.source,
        offer.sourceUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(textQuery);
    });

    if (!sortColumn || sortDirection === "none") return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [offers, filterStatus, filterSource, filterPeriod, filterText, sortColumn, sortDirection]);

  function openAddOfferModal() {
    setShowAddOffer(true);
    setShowAddOfferForm(false);
    setAddOfferMode("link");
    setAddOfferUrl("");
    setOfferForm(createDefaultOffer());
    setShowSettingsMenu(false);
  }

  function clearOfferFilters() {
    setFilterText("");
    setFilterStatus("all");
    setFilterSource("all");
    setFilterPeriod("all");
  }

  function openOfferDetails(offer: Offer) {
    const normalized = normalizeOfferForEdit(offer);
    setSelectedOffer(normalized);
    setSelectedOfferDraft(normalized);
    setEditingSelectedOffer(false);
  }

  function closeOfferDetails() {
    setSelectedOffer(null);
    setSelectedOfferDraft(null);
    setEditingSelectedOffer(false);
    setShowDeleteConfirm(false);
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

  async function fetchStats() {
    const response = await fetch("/api/offers/stats");
    const data = (await response.json()) as { ok: boolean; stats?: Partial<OfferStats>; error?: string };
    if (!data.ok) {
      throw new Error(data.error || t.failedFetchStats);
    }
    const next = data.stats || {};
    setStats({
      totalOffers: Number(next.totalOffers || 0),
      appliedOffers: Number(next.appliedOffers || 0),
      activeOffers: Number(next.activeOffers || 0),
      expiredOffers: Number(next.expiredOffers || 0),
      averageDaysLeft: typeof next.averageDaysLeft === "number" ? next.averageDaysLeft : null,
      recentApplications7d: Number(next.recentApplications7d || 0),
      statusCounts: next.statusCounts || {},
      sourceCounts: next.sourceCounts || {},
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffers(), fetchPreferences(), fetchStats()])
      .then(() => setStatusMessage(t.dataLoaded))
      .catch((error) => setStatusMessage(String(error)))
      .finally(() => setLoading(false));
  }, [language]);

  function togglePreferenceChip(field: keyof Omit<UserPreferences, "preferredWorkingHours">, value: string) {
    setPreferences((prev) => {
      const current = prev[field] as string[];
      const hasValue = current.includes(value);
      let next: string[] = [];

      if (value === "dowolny") {
        next = hasValue ? [] : ["dowolny"];
      } else if (hasValue) {
        next = current.filter((v) => v !== value);
      } else {
        next = [...current.filter((v) => v !== "dowolny"), value];
      }

      return {
        ...prev,
        [field]: next,
      };
    });
  }

  function toggleWorkingHoursChip(option: string) {
    setPreferences((prev) => {
      const selected = parseWorkingHoursSelection(prev.preferredWorkingHours);
      const hasOption = selected.includes(option);
      let next: string[] = [];

      if (option === "dowolny") {
        next = hasOption ? [] : ["dowolny"];
      } else if (hasOption) {
        next = selected.filter((v) => v !== option);
      } else {
        next = [...selected.filter((v) => v !== "dowolny"), option];
      }

      let nextShiftCounts: string[] = [];
      if (next.includes("dowolny")) {
        nextShiftCounts = ["dowolny"];
      } else if (next.length === 1) {
        nextShiftCounts = ["jedna zmiana"];
      } else if (next.length === 2) {
        nextShiftCounts = ["dwie zmiany"];
      } else if (next.length >= 3) {
        nextShiftCounts = ["trzy zmiany"];
      }

      return {
        ...prev,
        preferredShiftCounts: nextShiftCounts,
        preferredWorkingHours: serializeWorkingHoursSelection(next),
      };
    });
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

  useEffect(() => {
    if (activeTopTab !== "offers") {
      setDockOfferToolsToHeader(false);
      setShowSearchInput(false);
      return;
    }
    const target = offersToolbarRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setDockOfferToolsToHeader(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTopTab]);

  function renderOfferTools(isDocked: boolean) {
    return (
      <div className={`offers-toolbar-right ${isDocked ? "offers-toolbar-right--docked" : ""}`}>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setCompactView((prev) => !prev)}
          aria-label={t.viewMode}
          title={t.viewMode}
        >
          {isDocked ? "👁" : `👁 ${t.viewMode}: ${compactView ? t.viewCompact : t.viewFull}`}
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-label={t.filters}
          title={t.filters}
        >
          {isDocked ? "⏷" : `⏷ ${t.filters}`}
        </button>
        {!showSearchInput ? (
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowSearchInput(true)}
            aria-label={t.search}
            title={t.search}
          >
            {isDocked ? "🔍" : `🔍 ${t.search}`}
          </button>
        ) : (
          <div className={`toolbar-search-box ${isDocked ? "toolbar-search-box--docked" : ""}`}>
            <button
              type="button"
              className="toolbar-search-icon-btn"
              onClick={() => setShowSearchInput(false)}
              aria-label={t.search}
            >
              🔍
            </button>
            <input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder={t.search}
              className="toolbar-search-input"
              autoFocus
            />
          </div>
        )}
      </div>
    );
  }

  async function handleAddOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...offerForm,
        applied: inferAppliedFromStatus(offerForm.status),
      };
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || t.offerAddFailed);
      }

      setOfferForm(createDefaultOffer());
      setAddOfferUrl("");
      setShowAddOfferForm(false);
      setShowAddOffer(false);
      await Promise.all([fetchOffers(), fetchStats()]);
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
          datePosted?: string | null;
          expiresAt?: string | null;
          daysToExpire?: number | null;
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
        datePosted: data.job?.datePosted || prev.datePosted || "",
        expiresAt: data.job?.expiresAt || prev.expiresAt || "",
        daysToExpire: data.job?.daysToExpire ?? prev.daysToExpire ?? null,
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
    if (!importFile) {
      setStatusMessage(t.fileFirst);
      return;
    }

    setLoading(true);
    try {
      if (importTarget === "offers" && importFormat === "xlsx") {
        const formData = new FormData();
        formData.append("file", importFile);

        const response = await fetch("/api/offers/import-excel", {
          method: "POST",
          body: formData
        });

        const data = (await response.json()) as { ok: boolean; imported?: number; skipped?: number; error?: string };
        if (!data.ok) {
          throw new Error(data.error || t.excelImportFailed);
        }

        await Promise.all([fetchOffers(), fetchStats()]);
        setImportFile(null);
        setShowImportModal(false);
        setStatusMessage(
          t.excelImported
            .replace("{imported}", String(data.imported ?? 0))
            .replace("{skipped}", String(data.skipped ?? 0))
        );
        return;
      }

      if (importTarget === "offers" && importFormat === "json") {
        const rawText = await importFile.text();
        const parsed = JSON.parse(rawText);
        const entries = Array.isArray(parsed) ? parsed : parsed?.offers;
        if (!Array.isArray(entries)) {
          throw new Error(t.excelImportFailed);
        }

        let imported = 0;
        let skipped = 0;
        for (const entry of entries) {
          const response = await fetch("/api/offers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });
          const data = (await response.json()) as { ok: boolean };
          if (data.ok) imported += 1;
          else skipped += 1;
        }

        await Promise.all([fetchOffers(), fetchStats()]);
        setImportFile(null);
        setShowImportModal(false);
        setStatusMessage(
          t.excelImported
            .replace("{imported}", String(imported))
            .replace("{skipped}", String(skipped))
        );
        return;
      }

      if (importTarget === "preferences" && importFormat === "json") {
        const rawText = await importFile.text();
        const parsed = JSON.parse(rawText);
        const payload = parsed?.preferences || parsed;
        const response = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { ok: boolean; error?: string };
        if (!data.ok) {
          throw new Error(data.error || t.preferencesSaveFailed);
        }
        await fetchPreferences();
        setImportFile(null);
        setShowImportModal(false);
        setStatusMessage(t.importSuccess);
        return;
      }

      throw new Error(t.unsupportedImportCombo);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (exportTarget === "offers" && exportFormat === "xlsx") {
        window.open("/api/offers/export-excel", "_blank");
        setShowExportModal(false);
        setStatusMessage(t.exportSuccess);
        return;
      }

      if (exportFormat === "json") {
        const payload: Record<string, unknown> = {};
        if (exportTarget === "offers" || exportTarget === "all") {
          const offersResponse = await fetch("/api/offers");
          const offersData = (await offersResponse.json()) as { ok: boolean; offers?: Offer[]; error?: string };
          if (!offersData.ok) {
            throw new Error(offersData.error || t.failedFetchOffers);
          }
          payload.offers = offersData.offers || [];
        }
        if (exportTarget === "preferences" || exportTarget === "all") {
          const preferencesResponse = await fetch("/api/preferences");
          const preferencesData = (await preferencesResponse.json()) as {
            ok: boolean;
            preferences?: UserPreferences;
            error?: string;
          };
          if (!preferencesData.ok) {
            throw new Error(preferencesData.error || t.preferencesLoadFailed);
          }
          payload.preferences = preferencesData.preferences || createDefaultPreferences();
        }

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `applymanager-${exportTarget}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setShowExportModal(false);
        setStatusMessage(t.exportSuccess);
        return;
      }

      throw new Error(t.unsupportedExportCombo);
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
          datePosted: jobs[0].datePosted || "",
          expiresAt: jobs[0].expiresAt || "",
          daysToExpire: jobs[0].daysToExpire ?? null,
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
      datePosted: job.datePosted || "",
      expiresAt: job.expiresAt || "",
      daysToExpire: job.daysToExpire ?? null,
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
      const payload = {
        ...pendingOffer,
        applied: inferAppliedFromStatus(pendingOffer.status),
      };
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || t.saveScrapedFailed);
      }

      await fetchOffers();
      await fetchStats();
      setPendingOffer(null);
      setPendingScrapedIndex(null);
      setStatusMessage(t.scrapedSaved);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOfferDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOfferDraft?.id) return;

    setLoading(true);
    try {
      const payload = normalizeOfferForEdit(selectedOfferDraft);
      payload.applied = inferAppliedFromStatus(payload.status);
      const response = await fetch(`/api/offers/${selectedOfferDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok: boolean; offer?: Offer; error?: string };
      if (!data.ok || !data.offer) {
        throw new Error(data.error || t.offerAddFailed);
      }
      await Promise.all([fetchOffers(), fetchStats()]);
      const normalized = normalizeOfferForEdit(data.offer);
      setSelectedOffer(normalized);
      setSelectedOfferDraft(normalized);
      setEditingSelectedOffer(false);
      setStatusMessage(t.updated);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOfferDetails() {
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteOfferDetails() {
    if (!selectedOffer?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/offers/${selectedOffer.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(data.error || t.offerAddFailed);
      }
      await Promise.all([fetchOffers(), fetchStats()]);
      closeOfferDetails();
      setStatusMessage(t.deleted);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app" id="top">
      <header className="header app-bar">
        <a className="brand brand-link" href="#top">
          ApplyManager
        </a>

        <nav className="top-nav" aria-label="Sekcje">
          <button
            type="button"
            className={`ghost-btn nav-btn ${activeTopTab === "offers" ? "nav-btn--active" : ""}`}
            onClick={() => setActiveTopTab("offers")}
          >
            {t.offers}
          </button>
          <button
            type="button"
            className={`ghost-btn nav-btn ${activeTopTab === "stats" ? "nav-btn--active" : ""}`}
            onClick={() => setActiveTopTab("stats")}
          >
            {t.stats}
          </button>
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
                setShowImportModal(false);
                setShowExportModal(false);
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
                  onClick={() => {
                    setShowPreferences(true);
                    setShowImportModal(false);
                    setShowExportModal(false);
                    setShowUserMenu(false);
                  }}
                >
                  {t.preferences}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowImportModal(true);
                    setShowExportModal(false);
                    setShowUserMenu(false);
                  }}
                >
                  {t.importMenu}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowExportModal(true);
                    setShowImportModal(false);
                    setShowUserMenu(false);
                  }}
                >
                  {t.exportMenu}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {activeTopTab === "offers" && dockOfferToolsToHeader ? (
          <div className="header-docked-tools">{renderOfferTools(true)}</div>
        ) : null}
      </header>
      {activeTopTab === "offers" && dockOfferToolsToHeader ? (
        <div className="header-docked-spacer" aria-hidden="true" />
      ) : null}

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

      {activeTopTab === "offers" ? (
        <section className="card offers-card" id="offers-list">
          <div className="offers-head">
            <h2>{t.offers} ({visibleOffers.length}/{offers.length})</h2>
            <div className="offers-toolbar" ref={offersToolbarRef}>
              {!dockOfferToolsToHeader ? renderOfferTools(false) : null}
            </div>
          </div>

          {showFilters ? (
            <div className="offers-filters">
              <label className="form-field">
                <span>{t.filterByStatus}</span>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                  <option value="all">{t.all}</option>
                  {statusFilterOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>{t.filterBySource}</span>
                <select value={filterSource} onChange={(event) => setFilterSource(event.target.value)}>
                  <option value="all">{t.all}</option>
                  {sourceFilterOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>{t.filterByPeriod}</span>
                <select
                  value={filterPeriod}
                  onChange={(event) => setFilterPeriod(event.target.value as PeriodFilter)}
                >
                  <option value="all">{t.periodAll}</option>
                  <option value="month">{t.periodMonth}</option>
                  <option value="quarter">{t.periodQuarter}</option>
                  <option value="year">{t.periodYear}</option>
                </select>
              </label>
              <div className="offers-filters-actions">
                <button type="button" className="ghost-btn" onClick={clearOfferFilters}>
                  {t.clearFilters}
                </button>
              </div>
            </div>
          ) : null}

          {visibleOffers.length === 0 ? (
            <p className="hint">{offers.length === 0 ? t.noOffers : t.noFilterResults}</p>
          ) : (
            <div className="offers-table-wrap">
              <table className="offers-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("role", "text")}>
                        {t.role}{getSortIndicator("role")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("company", "text")}>
                        {t.company}{getSortIndicator("company")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("status", "text")}>
                        {t.status}{getSortIndicator("status")}
                      </button>
                    </th>
                    {!compactView ? (
                      <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("location", "text")}>
                        {t.location}{getSortIndicator("location")}
                      </button>
                      </th>
                    ) : null}
                    <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("appliedAt", "date")}>
                        {t.appliedAt}{getSortIndicator("appliedAt")}
                      </button>
                    </th>
                    {!compactView ? (
                      <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("datePosted", "date")}>
                        Data publikacji{getSortIndicator("datePosted")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("expiresAt", "date")}>
                        Wygasa{getSortIndicator("expiresAt")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("daysToExpire", "number")}>
                        Dni do końca{getSortIndicator("daysToExpire")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className="sort-btn" onClick={() => toggleSort("source", "text")}>
                        {t.source}{getSortIndicator("source")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? <th>{t.contractTypes}</th> : null}
                    {!compactView ? <th>{t.workTimes}</th> : null}
                    {!compactView ? <th>{t.workModes}</th> : null}
                    {!compactView ? <th>{t.shiftCounts}</th> : null}
                    {!compactView ? <th>{t.workHoursRange}</th> : null}
                    {!compactView ? <th>{t.notes}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleOffers.map((offer, index) => (
                    <tr
                      key={`${offer.id || "offer"}-${index}`}
                      className="clickable-row"
                      onClick={() => openOfferDetails(offer)}
                    >
                      <td>
                        {offer.sourceUrl ? (
                          <a
                            href={offer.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {offer.role || "-"}
                          </a>
                        ) : (
                          offer.role || "-"
                        )}
                      </td>
                      <td>{offer.company || "-"}</td>
                      <td>
                        <span className={`offer-status-pill offer-status-pill--${getOfferStatusTone(offer.status)}`}>
                          {offer.status || "-"}
                        </span>
                      </td>
                      {!compactView ? <td>{offer.location || "-"}</td> : null}
                      <td>{offer.appliedAt || "-"}</td>
                      {!compactView ? <td>{offer.datePosted || "-"}</td> : null}
                      {!compactView ? <td>{offer.expiresAt || "-"}</td> : null}
                      {!compactView ? (
                        <td>
                          {offer.daysToExpire === null || offer.daysToExpire === undefined
                            ? "-"
                            : offer.daysToExpire}
                        </td>
                      ) : null}
                      {!compactView ? <td>{offer.source || "manual"}</td> : null}
                      {!compactView ? <td>{(offer.employmentTypes || []).join(", ") || "-"}</td> : null}
                      {!compactView ? <td>{offer.workTime || "-"}</td> : null}
                      {!compactView ? <td>{offer.workMode || "-"}</td> : null}
                      {!compactView ? <td>{offer.shiftCount || "-"}</td> : null}
                      {!compactView ? <td>{offer.workingHours || "-"}</td> : null}
                      {!compactView ? <td>{offer.notes || "-"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="card" id="stats">
          <h2>{t.stats}</h2>
          <div className="stats-grid">
            <article className="stats-box"><strong>{stats.totalOffers}</strong><span>{t.totalOffers}</span></article>
            <article className="stats-box"><strong>{stats.appliedOffers}</strong><span>{t.appliedOffers}</span></article>
            <article className="stats-box"><strong>{stats.activeOffers}</strong><span>{t.activeOffers}</span></article>
            <article className="stats-box"><strong>{stats.expiredOffers}</strong><span>{t.expiredOffers}</span></article>
            <article className="stats-box"><strong>{stats.averageDaysLeft ?? "-"}</strong><span>{t.avgDaysLeft}</span></article>
            <article className="stats-box"><strong>{stats.recentApplications7d}</strong><span>{t.recentApplications}</span></article>
          </div>
          <div className="stats-grid">
            <article className="card">
              <h3>{t.statusBreakdown}</h3>
              <div className="list">
                {Object.entries(stats.statusCounts).map(([name, count]) => (
                  <p key={name}>{name}: {count}</p>
                ))}
                {Object.keys(stats.statusCounts).length === 0 ? <p className="hint">-</p> : null}
              </div>
            </article>
            <article className="card">
              <h3>{t.sourceBreakdown}</h3>
              <div className="list">
                {Object.entries(stats.sourceCounts).map(([name, count]) => (
                  <p key={name}>{name}: {count}</p>
                ))}
                {Object.keys(stats.sourceCounts).length === 0 ? <p className="hint">-</p> : null}
              </div>
            </article>
          </div>
        </section>
      )}

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
            <div className="row add-offer-mode">
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
                  <span>Data publikacji</span>
                  <input
                    type="date"
                    value={offerForm.datePosted || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, datePosted: event.target.value }))}
                  />
                </label>
                <label className="form-field">
                  <span>Wygasa</span>
                  <input
                    type="date"
                    value={offerForm.expiresAt || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
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

      {selectedOfferDraft ? (
        <div className="modal-backdrop">
          <div className="modal" id="offer-details-modal">
            <button
              type="button"
              className="modal-close"
              onClick={closeOfferDetails}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.offerDetails}</h3>
            <form className="grid" onSubmit={handleSaveOfferDetails}>
              <label className="form-field">
                <span>{t.company}</span>
                <input
                  value={selectedOfferDraft.company || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, company: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                  required
                />
              </label>
              <label className="form-field">
                <span>{t.role}</span>
                <input
                  value={selectedOfferDraft.role || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, role: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                  required
                />
              </label>
              <label className="form-field">
                <span>{t.status}</span>
                <select
                  value={selectedOfferDraft.status || "saved"}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                >
                  <option value="applied">applied</option>
                  <option value="saved">saved</option>
                  <option value="interview">interview</option>
                  <option value="offer">offer</option>
                  <option value="rejected">rejected</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t.location}</span>
                <input
                  value={selectedOfferDraft.location || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, location: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.appliedAt}</span>
                <input
                  type="date"
                  value={selectedOfferDraft.appliedAt || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, appliedAt: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>Data publikacji</span>
                <input
                  type="date"
                  value={selectedOfferDraft.datePosted || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, datePosted: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>Wygasa</span>
                <input
                  type="date"
                  value={selectedOfferDraft.expiresAt || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, expiresAt: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.source}</span>
                <input
                  value={selectedOfferDraft.source || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, source: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field span-2">
                <span>{t.offerLink}</span>
                <input
                  value={selectedOfferDraft.sourceUrl || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, sourceUrl: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field span-2">
                <span>{t.contractTypes}</span>
                <input
                  value={(selectedOfferDraft.employmentTypes || []).join(", ")}
                  onChange={(event) =>
                    setSelectedOfferDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            employmentTypes: event.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          }
                        : prev
                    )
                  }
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.workTimes}</span>
                <input
                  value={selectedOfferDraft.workTime || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, workTime: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.workModes}</span>
                <input
                  value={selectedOfferDraft.workMode || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, workMode: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.shiftCounts}</span>
                <input
                  value={selectedOfferDraft.shiftCount || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, shiftCount: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field">
                <span>{t.workHoursRange}</span>
                <input
                  value={selectedOfferDraft.workingHours || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, workingHours: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <label className="form-field span-2">
                <span>{t.notes}</span>
                <textarea
                  value={selectedOfferDraft.notes || ""}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                />
              </label>
              <div className="modal-actions span-2">
                {!editingSelectedOffer ? (
                  <button type="button" className="warning-btn" onClick={() => setEditingSelectedOffer(true)}>
                    {t.edit}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      setSelectedOfferDraft(selectedOffer ? normalizeOfferForEdit(selectedOffer) : null);
                      setEditingSelectedOffer(false);
                    }}
                    disabled={loading}
                  >
                    {t.cancel}
                  </button>
                )}
                {editingSelectedOffer ? (
                  <button type="submit" disabled={loading || !isSelectedOfferDirty}>
                    {t.save}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="danger-btn danger-btn--keep-color-disabled"
                  onClick={handleDeleteOfferDetails}
                  disabled={loading || (editingSelectedOffer && !isSelectedOfferDirty)}
                >
                  {t.delete}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm && selectedOffer ? (
        <div className="modal-backdrop">
          <div className="modal" id="delete-confirm-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowDeleteConfirm(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.confirmDeleteTitle}</h3>
            <p>{t.confirmDeleteText}</p>
            <p>
              <strong>{selectedOffer.company || "-"}</strong> - <strong>{selectedOffer.role || "-"}</strong>
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                {t.confirmDeleteNo}
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={confirmDeleteOfferDetails}
                disabled={loading}
              >
                {t.confirmDeleteYes}
              </button>
            </div>
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
                type="date"
                value={pendingOffer.datePosted || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, datePosted: event.target.value } : prev))}
              />
              <input
                type="date"
                value={pendingOffer.expiresAt || ""}
                onChange={(event) => setPendingOffer((prev) => (prev ? { ...prev, expiresAt: event.target.value } : prev))}
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
                <div className="preference-chip-group">
                  {CONTRACT_TYPES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`preference-chip ${
                        preferences.preferredContractTypes.includes(option)
                          ? "preference-chip--active"
                          : "preference-chip--inactive"
                      }`}
                      onClick={() => togglePreferenceChip("preferredContractTypes", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-field span-2">
                <span>{t.workTimes}</span>
                <div className="preference-chip-group">
                  {WORK_TIMES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`preference-chip ${
                        preferences.preferredWorkTimes.includes(option)
                          ? "preference-chip--active"
                          : "preference-chip--inactive"
                      }`}
                      onClick={() => togglePreferenceChip("preferredWorkTimes", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-field span-2">
                <span>{t.workModes}</span>
                <div className="preference-chip-group">
                  {WORK_MODES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`preference-chip ${
                        preferences.preferredWorkModes.includes(option)
                          ? "preference-chip--active"
                          : "preference-chip--inactive"
                      }`}
                      onClick={() => togglePreferenceChip("preferredWorkModes", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-field span-2">
                <span>{t.shiftCounts}</span>
                <div className="preference-chip-group">
                  {SHIFT_COUNTS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`preference-chip ${
                        preferences.preferredShiftCounts.includes(option)
                          ? "preference-chip--active"
                          : "preference-chip--inactive"
                      }`}
                      onClick={() => togglePreferenceChip("preferredShiftCounts", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-field span-2">
                <span>{t.workHoursRange}</span>
                <div className="preference-chip-group">
                  {WORKING_HOURS_OPTIONS.map((option) => {
                    const selected = parseWorkingHoursSelection(preferences.preferredWorkingHours).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`preference-chip ${selected ? "preference-chip--active" : "preference-chip--inactive"}`}
                        onClick={() => toggleWorkingHoursChip(option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
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

      {showImportModal ? (
        <div className="modal-backdrop">
          <div className="modal" id="import-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowImportModal(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.importData}</h3>
            <form className="grid" onSubmit={handleImportExcel}>
              <label className="form-field">
                <span>{t.dataToImport}</span>
                <select
                  value={importTarget}
                  onChange={(event) => setImportTarget(event.target.value as ImportTarget)}
                >
                  <option value="offers">{t.offersOnly}</option>
                  <option value="preferences">{t.preferencesOnly}</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t.fileFormat}</span>
                <select
                  value={importFormat}
                  onChange={(event) => setImportFormat(event.target.value as ImportFormat)}
                >
                  <option value="xlsx">xlsx</option>
                  <option value="json">json</option>
                </select>
              </label>
              <label className="form-field span-2">
                <span>Plik</span>
                <input
                  type="file"
                  accept={importFormat === "xlsx" ? ".xlsx,.xls" : ".json"}
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
              </label>
              <div className="modal-actions span-2">
                <button type="button" className="ghost-btn" onClick={() => setShowImportModal(false)} disabled={loading}>
                  {t.close}
                </button>
                <button type="submit" disabled={loading}>
                  {t.import}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showExportModal ? (
        <div className="modal-backdrop">
          <div className="modal" id="export-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowExportModal(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.exportData}</h3>
            <form className="grid" onSubmit={handleExportData}>
              <label className="form-field">
                <span>{t.dataToExport}</span>
                <select
                  value={exportTarget}
                  onChange={(event) => setExportTarget(event.target.value as ExportTarget)}
                >
                  <option value="offers">{t.offersOnly}</option>
                  <option value="preferences">{t.preferencesOnly}</option>
                  <option value="all">{t.allData}</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t.fileFormat}</span>
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                >
                  <option value="xlsx">xlsx</option>
                  <option value="json">json</option>
                </select>
              </label>
              <div className="modal-actions span-2">
                <button type="button" className="ghost-btn" onClick={() => setShowExportModal(false)} disabled={loading}>
                  {t.close}
                </button>
                <button type="submit" disabled={loading}>
                  {t.exportMenu}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
