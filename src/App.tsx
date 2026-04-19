import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I18N, type Language } from "./i18n/translations";

type Offer = {
  id?: number;
  company: string;
  role: string;
  applied: boolean;
  archive?: boolean;
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

type ExcelImportIssue = {
  rowNumber?: number;
  missingFields?: string[];
  formulaIssues?: string[];
  parsed?: {
    company?: string | null;
    role?: string | null;
    status?: string | null;
    location?: string | null;
    appliedAt?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    notes?: string | null;
  };
  raw?: Record<string, unknown>;
};

type ExportAssistantRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  missingFields: string[];
  draft: Offer;
  saved: boolean;
};

type ImportPreviewMeta = {
  filename?: string;
  size?: number;
  sha256?: string;
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
type StatusTone = "blue" | "yellow" | "green" | "red" | "neutral" | "pink";
type CanonicalStatus =
  | "Zapisano"
  | "Wyslano"
  | "Odczytano"
  | "W trakcie"
  | "Rozmowa"
  | "Oferta"
  | "Odrzucono"
  | "Odmowa";
type NotificationTone = "success" | "error" | "warning" | "neutral";
type RowExitAnimationKind = "archive" | "delete";
type AppNotification = {
  id: number;
  text: string;
  tone: NotificationTone;
  read: boolean;
  surfaceVisible: boolean;
  menuVisible: boolean;
  surfaceClosing?: boolean;
  menuClosing?: boolean;
  kind: "operational";
};


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
const ARCHIVED_FILTER_VALUE = "__archived__";
const STATUS_OPTIONS: CanonicalStatus[] = [
  "Wyslano",
  "Zapisano",
  "Odczytano",
  "W trakcie",
  "Rozmowa",
  "Oferta",
  "Odrzucono",
  "Odmowa",
];

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

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeForDuplicate(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeUrlForDuplicate(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "").toLowerCase();
}

function normalizeDateForDuplicate(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 10);
}

function createDefaultOffer(): Offer {
  return {
    company: "",
    role: "",
    applied: true,
    archive: false,
    status: "Wyslano",
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

function normalizeImportEntryToOffer(entry: Partial<Offer>): Offer {
  const normalizedStatus = normalizeOfferStatus(entry.status, entry.applied !== false);
  return {
    ...createDefaultOffer(),
    ...entry,
    company: String(entry.company || "").trim(),
    role: String(entry.role || "").trim(),
    status: normalizedStatus,
    applied: inferAppliedFromStatus(normalizedStatus),
    archive: entry.archive === true,
    location: String(entry.location || "").trim(),
    notes: String(entry.notes || ""),
    appliedAt: entry.appliedAt || getTodayDate(),
    source: String(entry.source || "import_excel").trim() || "import_excel",
    sourceUrl: String(entry.sourceUrl || "").trim(),
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
    archive: offer.archive === true,
    company: String(offer.company || ""),
    role: String(offer.role || ""),
    status: normalizeOfferStatus(offer.status, offer.applied !== false),
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
  const normalized = normalizeStatusKey(status);
  return normalized !== "zapisano" && normalized !== "saved";
}

function getPrimaryLocation(location: string | null | undefined): string {
  const text = String(location || "").trim();
  if (!text) return "-";
  return text.split(",")[0]?.trim() || text;
}

function getAssistantFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    company: "Firma",
    role: "Stanowisko",
    location: "Lokalizacja",
    status: "Status",
    source: "Zrodlo",
    sourceUrl: "Link",
    notes: "Notatki",
  };
  return labels[field] || field;
}

function normalizeStatusKey(status: string | null | undefined): string {
  return String(status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getNotificationAutoHideMs(tone: NotificationTone): number | null {
  if (tone === "success") return 5000;
  if (tone === "warning") return 30000;
  if (tone === "error") return null;
  return 10000;
}

const NOTIFICATION_CLOSE_ANIMATION_MS = 180;
const ROW_EXIT_ANIMATION_MS = 320;

function normalizeOfferStatus(status: string | null | undefined, appliedDefault = true): CanonicalStatus {
  const normalized = normalizeStatusKey(status);
  if (!normalized) return appliedDefault ? "Wyslano" : "Zapisano";

  if (["applied", "wyslano", "sent", "zaaplikowano"].includes(normalized)) return "Wyslano";
  if (["saved", "zapisano", "draft"].includes(normalized)) return "Zapisano";
  if (["odczytano", "odczytana", "read"].includes(normalized)) return "Odczytano";
  if (["interview", "in progress", "w trakcie", "proces"].includes(normalized)) return "W trakcie";
  if (["rozmowa", "rozmowa umowiona", "umowienie na rozmowe"].includes(normalized)) return "Rozmowa";
  if (["offer", "oferta"].includes(normalized)) return "Oferta";
  if (normalized.includes("odrzu") || normalized.includes("rejected")) return "Odrzucono";
  if (normalized.includes("odmow")) return "Odmowa";

  return appliedDefault ? "Wyslano" : "Zapisano";
}

function getExpiryTone(daysToExpire: number | null | undefined): StatusTone | "expired" {
  if (daysToExpire === null || daysToExpire === undefined) return "neutral";
  if (daysToExpire < 0) return "expired";
  if (daysToExpire >= 21) return "green";
  if (daysToExpire >= 10) return "yellow";
  return "red";
}

function formatDaysToExpire(daysToExpire: number | null | undefined): string {
  if (daysToExpire === null || daysToExpire === undefined) return "-";
  if (daysToExpire < 0) return "Wygaslo";
  if (daysToExpire === 0) return "0 dni";
  if (daysToExpire === 1) return "1 dzien";
  return `${daysToExpire} dni`;
}

export function App() {
  const headerRef = useRef<HTMLElement | null>(null);
  const offersSectionRef = useRef<HTMLElement | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerForm, setOfferForm] = useState<Offer>(createDefaultOffer);
  const [scrapeQuery, setScrapeQuery] = useState("frontend react");
  const [scrapedJobs, setScrapedJobs] = useState<ScrapedJob[]>([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [pendingScrapedIndex, setPendingScrapedIndex] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showImportAssistantPrompt, setShowImportAssistantPrompt] = useState(false);
  const [showExportAssistant, setShowExportAssistant] = useState(false);
  const [exportAssistantRows, setExportAssistantRows] = useState<ExportAssistantRow[]>([]);
  const [activeAssistantIndex, setActiveAssistantIndex] = useState(0);
  const assistantRawWindowRef = useRef<HTMLElement | null>(null);
  const assistantEditWindowRef = useRef<HTMLElement | null>(null);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [addOfferUrl, setAddOfferUrl] = useState("");
  const [addOfferOperationMessage, setAddOfferOperationMessage] = useState("");
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [addOfferMode, setAddOfferMode] = useState<AddOfferMode>("link");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDataManagementMenu, setShowDataManagementMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importOperationMessage, setImportOperationMessage] = useState("");
  const [showImportSummaryModal, setShowImportSummaryModal] = useState(false);
  const [importedPreviewOffers, setImportedPreviewOffers] = useState<Offer[]>([]);
  const [selectedImportedOfferIds, setSelectedImportedOfferIds] = useState<number[]>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [importPreviewMeta, setImportPreviewMeta] = useState<ImportPreviewMeta | null>(null);
  const [pendingImportIssues, setPendingImportIssues] = useState<ExcelImportIssue[]>([]);
  const [confirmDuplicateImport, setConfirmDuplicateImport] = useState(false);
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
  const [sortAnimating, setSortAnimating] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [hoveredOfferId, setHoveredOfferId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [quickStatusOfferId, setQuickStatusOfferId] = useState<number | null>(null);
  const [quickStatusValue, setQuickStatusValue] = useState<CanonicalStatus>("Wyslano");
  const [quickStatusMenuOpen, setQuickStatusMenuOpen] = useState(false);
  const [quickStatusMenuPos, setQuickStatusMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [quickStatusBoxPos, setQuickStatusBoxPos] = useState<{ top: number; left: number } | null>(null);
  const [quickStatusMode, setQuickStatusMode] = useState<"single" | "bulk">("single");
  const [closingHoverPanelRowId, setClosingHoverPanelRowId] = useState<number | null>(null);
  const [pinnedOfferIds, setPinnedOfferIds] = useState<number[]>([]);
  const [rowExitAnimations, setRowExitAnimations] = useState<Record<number, RowExitAnimationKind>>({});
  const sortAnimationTimerRef = useRef<number | null>(null);
  const hoverPanelCloseTimerRef = useRef<number | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedOfferDraft, setSelectedOfferDraft] = useState<Offer | null>(null);
  const [editingSelectedOffer, setEditingSelectedOffer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [dockOfferToolsToHeader, setDockOfferToolsToHeader] = useState(false);
  const offersToolbarRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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
  const isHeaderMenuOpen = showUserMenu || showNotificationsMenu || showSettingsMenu;
  const resolvedTheme = themeMode === "auto" ? (systemPrefersDark ? "dark" : "light") : themeMode;
  const t = I18N[language];
  const aboutReleaseDate = useMemo(() => getTodayLocalDate(), []);
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => item.menuVisible && !item.read).length,
    [notifications]
  );
  const visibleCenterNotifications = useMemo(
    () =>
      notifications
        .filter((item) => item.surfaceVisible && (item.tone === "warning" || item.tone === "error"))
        .slice(0, 3),
    [notifications]
  );
  const visibleToastNotifications = useMemo(
    () =>
      notifications
        .filter((item) => item.surfaceVisible && (item.tone === "success" || item.tone === "neutral"))
        .slice(0, 4),
    [notifications]
  );
  const visibleMenuNotifications = useMemo(() => notifications.filter((item) => item.menuVisible), [notifications]);
  const isSelectedOfferDirty = useMemo(() => {
    if (!editingSelectedOffer || !selectedOffer || !selectedOfferDraft) return false;
    const baseline = JSON.stringify(normalizeOfferForEdit(selectedOffer));
    const current = JSON.stringify(normalizeOfferForEdit(selectedOfferDraft));
    return baseline !== current;
  }, [editingSelectedOffer, selectedOffer, selectedOfferDraft]);

  function setStatusMessage(nextMessage: string) {
    if (!nextMessage?.trim()) return;
    const tone: NotificationTone =
      /error|failed|invalid|http\s*\d+/i.test(nextMessage)
        ? "error"
        : /warning|uwaga|pominieto|skipped/i.test(nextMessage)
          ? "warning"
          : "success";
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const notification: AppNotification = {
      id,
      text: nextMessage,
      tone,
      read: false,
      surfaceVisible: true,
      menuVisible: true,
      surfaceClosing: false,
      menuClosing: false,
      kind: "operational",
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 80));
    const hideAfterMs = getNotificationAutoHideMs(tone);
    if (hideAfterMs !== null) {
      window.setTimeout(() => {
        dismissSurfaceNotification(id);
      }, hideAfterMs);
    }
  }

  function dismissSurfaceNotification(id: number) {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, surfaceClosing: true } : item)));
    window.setTimeout(() => {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, surfaceVisible: false, surfaceClosing: false } : item))
      );
    }, NOTIFICATION_CLOSE_ANIMATION_MS);
  }

  function dismissMenuNotification(id: number) {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, menuClosing: true } : item)));
    window.setTimeout(() => {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, menuVisible: false, menuClosing: false, read: true } : item))
      );
    }, NOTIFICATION_CLOSE_ANIMATION_MS);
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

  function getSortButtonClass(column: SortColumn) {
    const isActive = sortColumn === column && sortDirection !== "none";
    return `sort-btn${isActive ? " sort-btn--active" : ""}${isActive && sortAnimating ? " sort-btn--animating" : ""}`;
  }

  function getOfferStatusTone(status: string | null | undefined): StatusTone {
    const normalized = normalizeOfferStatus(status);
    if (normalized === "Wyslano") {
      return "blue";
    }
    if (normalized === "Zapisano") {
      return "neutral";
    }
    if (normalized === "Odczytano") {
      return "pink";
    }
    if (normalized === "W trakcie") {
      return "yellow";
    }
    if (["Rozmowa", "Oferta"].includes(normalized)) {
      return "green";
    }
    if (["Odrzucono", "Odmowa"].includes(normalized)) {
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
      if (filterStatus === ARCHIVED_FILTER_VALUE) {
        if (offer.archive !== true) return false;
      } else if (filterStatus === "all") {
        if (offer.archive === true) return false;
      } else {
        if (offer.archive === true) return false;
        if ((offer.status || "") !== filterStatus) return false;
      }
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

    if (!sortColumn || sortDirection === "none") {
      if (!pinnedOfferIds.length) return filtered;
      const pinnedSet = new Set(pinnedOfferIds);
      const pinned = filtered.filter((offer) => typeof offer.id === "number" && pinnedSet.has(offer.id));
      pinned.sort((a, b) => pinnedOfferIds.indexOf(a.id as number) - pinnedOfferIds.indexOf(b.id as number));
      const unpinned = filtered.filter((offer) => !(typeof offer.id === "number" && pinnedSet.has(offer.id)));
      return [...pinned, ...unpinned];
    }

    return [...filtered].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [offers, filterStatus, filterSource, filterPeriod, filterText, sortColumn, sortDirection, pinnedOfferIds]);

  const isQuickStatusLocked = quickStatusOfferId !== null;

  function openAddOfferModal() {
    setShowAddOffer(true);
    setShowAddOfferForm(false);
    setAddOfferMode("link");
    setAddOfferUrl("");
    setAddOfferOperationMessage("");
    setOfferForm(createDefaultOffer());
    setShowSettingsMenu(false);
  }

  function clearOfferFilters() {
    setFilterText("");
    setFilterStatus("all");
    setFilterSource("all");
    setFilterPeriod("all");
  }

  function getOfferId(offer: Offer): number | null {
    return typeof offer.id === "number" ? offer.id : null;
  }

  function findOfferById(id: number): Offer | null {
    return offers.find((offer) => offer.id === id) || null;
  }

  function toggleEditorMode() {
    setEditorMode((prev) => {
      const next = !prev;
      setStatusMessage(next ? t.editorModeEnabled : t.editorModeDisabled);
      return next;
    });
  }

  function toggleRowSelection(offer: Offer) {
    const id = getOfferId(offer);
    if (id === null) return;
    setSelectedRowIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  function togglePinOffer(offer: Offer) {
    const id = getOfferId(offer);
    if (id === null) return;
    if (sortColumn && sortDirection !== "none") {
      setStatusMessage(t.pinNeedsNoSort);
      return;
    }
    setPinnedOfferIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [id, ...prev]));
  }

  function pinSelectedOffers() {
    const ids = selectedRowIds.filter((id) => typeof id === "number");
    if (!ids.length) return;
    if (sortColumn && sortDirection !== "none") {
      setStatusMessage(t.pinNeedsNoSort);
      return;
    }
    setPinnedOfferIds((prev) => {
      const prevSet = new Set(prev);
      const allSelectedPinned = ids.every((id) => prevSet.has(id));

      if (allSelectedPinned) {
        const selectedSet = new Set(ids);
        return prev.filter((id) => !selectedSet.has(id));
      }

      const newIds = ids.filter((id) => !prevSet.has(id));
      if (!newIds.length) return prev;
      return [...newIds, ...prev];
    });
  }

  async function updateOfferArchiveQuick(offer: Offer, archiveValue: boolean) {
    const id = getOfferId(offer);
    if (id === null) return;
    const payload = normalizeOfferForEdit(offer);
    payload.archive = archiveValue;
    const response = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok: boolean; offer?: Offer; error?: string };
    if (!data.ok || !data.offer) {
      throw new Error(data.error || t.offerAddFailed);
    }
  }

  async function archiveOffer(offer: Offer) {
    const id = getOfferId(offer);
    const nextArchiveValue = offer.archive !== true;
    setLoading(true);
    try {
      await runWithRowExitAnimation(id === null ? [] : [id], "archive", async () => {
        await updateOfferArchiveQuick(offer, nextArchiveValue);
        await Promise.all([fetchOffers(), fetchStats()]);
      });
      setStatusMessage(nextArchiveValue ? t.archived : t.restored);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function archiveSelectedOffers() {
    const targets = selectedRowIds
      .map((id) => findOfferById(id))
      .filter((entry): entry is Offer => Boolean(entry));
    if (targets.length === 0) return;
    const allArchived = targets.every((offer) => offer.archive === true);
    const nextArchiveValue = !allArchived;
    const targetIds = targets
      .map((offer) => getOfferId(offer))
      .filter((id): id is number => typeof id === "number");

    setLoading(true);
    try {
      await runWithRowExitAnimation(targetIds, "archive", async () => {
        await Promise.all(targets.map((offer) => updateOfferArchiveQuick(offer, nextArchiveValue)));
        await Promise.all([fetchOffers(), fetchStats()]);
      });
      setStatusMessage(nextArchiveValue ? t.archived : t.restored);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function updateOfferStatusQuick(offer: Offer, status: CanonicalStatus) {
    const id = getOfferId(offer);
    if (id === null) return;
    const payload = normalizeOfferForEdit(offer);
    payload.status = status;
    payload.applied = inferAppliedFromStatus(status);
    const response = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok: boolean; offer?: Offer; error?: string };
    if (!data.ok || !data.offer) {
      throw new Error(data.error || t.offerAddFailed);
    }
  }

  async function submitQuickStatus(offer: Offer) {
    setLoading(true);
    try {
      const targets =
        quickStatusMode === "bulk"
          ? selectedRowIds
              .map((id) => findOfferById(id))
              .filter((entry): entry is Offer => Boolean(entry))
          : [offer];

      const seenIds = new Set<number>();
      const uniqueTargets: Offer[] = [];
      for (const entry of targets) {
        const id = getOfferId(entry);
        if (id === null || seenIds.has(id)) continue;
        seenIds.add(id);
        uniqueTargets.push(entry);
      }
      const effectiveTargets: Offer[] = uniqueTargets.length > 0 ? uniqueTargets : [offer];

      await Promise.all(effectiveTargets.map((entry) => updateOfferStatusQuick(entry, quickStatusValue)));
      await Promise.all([fetchOffers(), fetchStats()]);
      setQuickStatusOfferId(null);
      setQuickStatusMenuOpen(false);
      setQuickStatusMenuPos(null);
      setQuickStatusBoxPos(null);
      setQuickStatusMode("single");
      setStatusMessage(t.updated);
    } catch (error) {
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function openQuickStatus(offer: Offer, mode: "single" | "bulk" = "single", triggerEl?: HTMLElement) {
    const id = getOfferId(offer);
    if (id === null) return;
    setQuickStatusOfferId(id);
    setQuickStatusMenuOpen(false);
    setQuickStatusMenuPos(null);
    if (mode === "single" && triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      const approxWidth = 360;
      const approxHeight = 48;
      const boxGap = 3;
      const maxLeft = Math.max(8, window.innerWidth - approxWidth - 8);
      const left = Math.min(Math.max(8, rect.left), maxLeft);
      let top = rect.bottom + boxGap;
      if (top + approxHeight > window.innerHeight - 8) {
        top = rect.top - approxHeight - boxGap;
      }
      if (top < 8) {
        top = 8;
      }
      setQuickStatusBoxPos({ top, left });
    } else {
      setQuickStatusBoxPos(null);
    }
    setQuickStatusMode(mode);
    setQuickStatusValue(normalizeOfferStatus(offer.status, offer.applied !== false));
    setHoveredOfferId(id);
    setShowFilters(false);
    setShowSearchInput(false);
  }

  function closeQuickStatusEditor() {
    setQuickStatusOfferId(null);
    setQuickStatusMenuOpen(false);
    setQuickStatusMenuPos(null);
    setQuickStatusBoxPos(null);
    setQuickStatusMode("single");
  }

  function openQuickStatusMenu(triggerEl: HTMLElement) {
    const rect = triggerEl.getBoundingClientRect();
    const menuMinWidth = Math.max(170, Math.round(rect.width));
    const estimatedHeight = STATUS_OPTIONS.length * 36 + 16;
    const menuGap = 4;
    const maxLeft = Math.max(8, window.innerWidth - menuMinWidth - 8);
    let left = Math.min(rect.left, maxLeft);
    let top = rect.bottom + menuGap;

    if (quickStatusMode === "single" && quickStatusBoxPos) {
      const boxHeight = 46;
      left = Math.min(Math.max(8, quickStatusBoxPos.left + 8), maxLeft);
      const boxTop = quickStatusBoxPos.top;
      const preferUp = boxTop > window.innerHeight * 0.6;
      if (preferUp) {
        top = boxTop - estimatedHeight - menuGap;
        if (top < 8) {
          top = boxTop + boxHeight + menuGap;
        }
      } else {
        top = boxTop + boxHeight + menuGap;
        if (top + estimatedHeight > window.innerHeight - 8) {
          top = Math.max(8, boxTop - estimatedHeight - menuGap);
        }
      }
    } else if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - menuGap);
    }

    setQuickStatusMenuPos({ top, left, minWidth: menuMinWidth });
    setQuickStatusMenuOpen(true);
  }

  function toggleQuickStatusMenu(triggerEl: HTMLElement) {
    if (quickStatusMenuOpen) {
      setQuickStatusMenuOpen(false);
      setQuickStatusMenuPos(null);
      return;
    }
    openQuickStatusMenu(triggerEl);
  }

  useEffect(() => {
    if (!quickStatusMenuOpen) return;
    const close = () => {
      setQuickStatusMenuOpen(false);
      setQuickStatusMenuPos(null);
    };
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".quick-status-picker__trigger") || target.closest(".quick-status-picker__menu")) return;
      close();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [quickStatusMenuOpen]);

  useEffect(() => {
    if (quickStatusMode !== "single" || quickStatusOfferId === null) return;
    const close = () => closeQuickStatusEditor();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [quickStatusMode, quickStatusOfferId]);

  function openDeleteFromRow(offer: Offer) {
    const normalized = normalizeOfferForEdit(offer);
    setQuickStatusOfferId(null);
    setSelectedOffer(normalized);
    setSelectedOfferDraft(null);
    setEditingSelectedOffer(false);
    setShowDeleteConfirm(true);
  }

  async function runWithRowExitAnimation(targetIds: number[], kind: RowExitAnimationKind, task: () => Promise<void>) {
    const uniqueIds = Array.from(new Set(targetIds.filter((id) => typeof id === "number")));
    if (uniqueIds.length > 0) {
      setRowExitAnimations((prev) => {
        const next = { ...prev };
        for (const id of uniqueIds) {
          next[id] = kind;
        }
        return next;
      });
      await new Promise((resolve) => window.setTimeout(resolve, ROW_EXIT_ANIMATION_MS));
    }

    try {
      await task();
    } finally {
      if (uniqueIds.length > 0) {
        setRowExitAnimations((prev) => {
          const next = { ...prev };
          for (const id of uniqueIds) {
            delete next[id];
          }
          return next;
        });
      }
    }
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
    setShowBulkDeleteConfirm(false);
  }

  function closeAddOfferModal() {
    setShowAddOffer(false);
    setShowAddOfferForm(false);
    setAddOfferUrl("");
    setAddOfferOperationMessage("");
  }

  function resetImportAssistantState() {
    setPendingImportIssues([]);
    setExportAssistantRows([]);
    setActiveAssistantIndex(0);
    setShowImportAssistantPrompt(false);
    setShowExportAssistant(false);
    setImportPreviewMeta(null);
  }

  function openImportSummary(
    importedOffers: Offer[],
    imported: number,
    skipped: number,
    issues: ExcelImportIssue[] = [],
    previewMeta: ImportPreviewMeta | null = null
  ) {
    setImportedPreviewOffers(importedOffers.map((offer) => normalizeImportEntryToOffer(offer)));
    setImportSummary({ imported, skipped });
    setSelectedImportedOfferIds([]);
    setPendingImportIssues(issues);
    setImportPreviewMeta(previewMeta);
    setConfirmDuplicateImport(false);
    setShowImportSummaryModal(true);
  }

  const duplicateImportIndexes = useMemo(() => {
    const existingUrlKeys = new Set<string>();
    const existingDateKeys = new Set<string>();
    const existingBaseKeys = new Set<string>();

    for (const offer of offers) {
      const company = normalizeForDuplicate(offer.company);
      const role = normalizeForDuplicate(offer.role);
      if (!company || !role) continue;
      const base = `${company}||${role}`;
      existingBaseKeys.add(base);

      const sourceUrl = normalizeUrlForDuplicate(offer.sourceUrl);
      if (sourceUrl) {
        existingUrlKeys.add(`${base}||${sourceUrl}`);
      }

      const appliedAt = normalizeDateForDuplicate(offer.appliedAt);
      if (appliedAt) {
        existingDateKeys.add(`${base}||${appliedAt}`);
      }
    }

    const indexes: number[] = [];
    for (let index = 0; index < importedPreviewOffers.length; index += 1) {
      const offer = importedPreviewOffers[index];
      const company = normalizeForDuplicate(offer.company);
      const role = normalizeForDuplicate(offer.role);
      if (!company || !role) continue;
      const base = `${company}||${role}`;
      const sourceUrl = normalizeUrlForDuplicate(offer.sourceUrl);
      const appliedAt = normalizeDateForDuplicate(offer.appliedAt);

      const isDuplicate =
        (sourceUrl && existingUrlKeys.has(`${base}||${sourceUrl}`)) ||
        (appliedAt && existingDateKeys.has(`${base}||${appliedAt}`)) ||
        (!sourceUrl && !appliedAt && existingBaseKeys.has(base));

      if (isDuplicate) {
        indexes.push(index);
      }
    }
    return indexes;
  }, [offers, importedPreviewOffers]);

  const duplicateImportIndexSet = useMemo(() => new Set(duplicateImportIndexes), [duplicateImportIndexes]);
  const hasDuplicateImports = duplicateImportIndexes.length > 0;
  const hasUnresolvedCompanyFormulaIssues = useMemo(
    () =>
      pendingImportIssues.some((issue) =>
        (issue.formulaIssues || []).includes("unresolved_company_formula")
      ),
    [pendingImportIssues]
  );

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
    setOffers(
      (data.offers || []).map((offer) => ({
        ...offer,
        archive: offer.archive === true,
        status: normalizeOfferStatus(offer.status, offer.applied !== false),
      }))
    );
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

  useEffect(() => {
    if (!showImportModal) {
      setImportOperationMessage("");
    }
  }, [showImportModal]);

  useEffect(() => {
    if (offers.length === 0) {
      setDockOfferToolsToHeader(false);
    }
  }, [offers.length]);

  useEffect(() => {
    if (!showUserMenu) return;

    const closeUserMenuOnScroll = () => {
      setShowUserMenu(false);
      setShowSettingsMenu(false);
      setShowDataManagementMenu(false);
    };

    window.addEventListener("scroll", closeUserMenuOnScroll, { passive: true });
    window.addEventListener("wheel", closeUserMenuOnScroll, { passive: true });
    window.addEventListener("touchmove", closeUserMenuOnScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", closeUserMenuOnScroll);
      window.removeEventListener("wheel", closeUserMenuOnScroll);
      window.removeEventListener("touchmove", closeUserMenuOnScroll);
    };
  }, [showUserMenu]);

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
      setStatusMessage(error instanceof Error ? error.message : String(error));
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
    if (!showExportAssistant) return;
    requestAnimationFrame(() => {
      if (assistantRawWindowRef.current) assistantRawWindowRef.current.scrollTop = 0;
      if (assistantEditWindowRef.current) assistantEditWindowRef.current.scrollTop = 0;
    });
  }, [showExportAssistant, activeAssistantIndex]);

  useEffect(() => {
    if (!showSearchInput) return;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [showSearchInput, dockOfferToolsToHeader]);

  useEffect(() => {
    if (!editorMode) {
      setSelectedRowIds([]);
      setHoveredOfferId(null);
      setQuickStatusOfferId(null);
    }
  }, [editorMode]);

  useEffect(() => {
    const existingIds = new Set(offers.map((offer) => offer.id).filter((id): id is number => typeof id === "number"));
    setPinnedOfferIds((prev) => prev.filter((id) => existingIds.has(id)));
    setSelectedRowIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [offers]);

  useEffect(() => {
    if (!sortColumn || sortDirection === "none") return;
    if (sortAnimationTimerRef.current !== null) {
      window.clearTimeout(sortAnimationTimerRef.current);
    }
    setSortAnimating(true);
    sortAnimationTimerRef.current = window.setTimeout(() => {
      setSortAnimating(false);
      sortAnimationTimerRef.current = null;
    }, 220);
  }, [sortColumn, sortDirection]);

  useEffect(
    () => () => {
      if (sortAnimationTimerRef.current !== null) {
        window.clearTimeout(sortAnimationTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (activeTopTab !== "offers") {
      setDockOfferToolsToHeader(false);
      setShowSearchInput(false);
      return;
    }
    if (offers.length === 0) {
      setDockOfferToolsToHeader(false);
      return;
    }
    const target = offersToolbarRef.current;
    const offersSection = offersSectionRef.current;
    if (!target || !offersSection) {
      setDockOfferToolsToHeader(false);
      return;
    }

    const syncDockState = () => {
      const rect = target.getBoundingClientRect();
      const sectionRect = offersSection.getBoundingClientRect();
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 88;
      const dockOnOffset = 28;
      const dockOffOffset = 120;
      const dynamicDockThreshold = headerBottom + (dockOfferToolsToHeader ? dockOffOffset : dockOnOffset);
      const sectionStillVisible = sectionRect.bottom > headerBottom + 16;
      const scrolledEnough = window.scrollY > 32;
      const shouldDock = scrolledEnough && rect.top <= dynamicDockThreshold && sectionStillVisible;
      setDockOfferToolsToHeader(shouldDock);
    };

    syncDockState();
    window.addEventListener("scroll", syncDockState, { passive: true });
    window.addEventListener("resize", syncDockState);

    return () => {
      window.removeEventListener("scroll", syncDockState);
      window.removeEventListener("resize", syncDockState);
    };
  }, [activeTopTab, offers.length, dockOfferToolsToHeader]);

  useEffect(() => {
    return () => {
      if (hoverPanelCloseTimerRef.current) {
        window.clearTimeout(hoverPanelCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (quickStatusMode === "bulk" && selectedRowIds.length === 0) {
      closeQuickStatusEditor();
    }
  }, [selectedRowIds.length, quickStatusMode]);

  function handleEditorRowMouseEnter(rowId: number | null, canInteractWithRow: boolean) {
    if (!canInteractWithRow) return;
    if (hoverPanelCloseTimerRef.current) {
      window.clearTimeout(hoverPanelCloseTimerRef.current);
      hoverPanelCloseTimerRef.current = null;
    }
    setClosingHoverPanelRowId(null);
    setHoveredOfferId(rowId);
  }

  function handleEditorRowMouseLeave(rowId: number | null, canInteractWithRow: boolean) {
    if (!canInteractWithRow) return;
    setHoveredOfferId((prev) => (prev === rowId ? null : prev));
    if (rowId === null) return;
    setClosingHoverPanelRowId(rowId);
    if (hoverPanelCloseTimerRef.current) {
      window.clearTimeout(hoverPanelCloseTimerRef.current);
    }
    hoverPanelCloseTimerRef.current = window.setTimeout(() => {
      setClosingHoverPanelRowId((prev) => (prev === rowId ? null : prev));
      hoverPanelCloseTimerRef.current = null;
    }, 170);
  }

  function renderEditorSelectionBar() {
    if (!editorMode) return null;
    const hasSelection = selectedRowIds.length > 0;
    const firstSelected = hasSelection ? findOfferById(selectedRowIds[0]) : null;
    const allSelectedPinned = hasSelection && selectedRowIds.every((id) => pinnedOfferIds.includes(id));
    const allSelectedArchived = hasSelection && selectedRowIds.every((id) => findOfferById(id)?.archive === true);
    const showBulkQuickStatusEditor = hasSelection && quickStatusMode === "bulk" && quickStatusOfferId !== null && !!firstSelected;
    return (
      <div
        className={`editor-selection-inline ${hasSelection ? "is-open" : "is-closed"} ${showBulkQuickStatusEditor ? "has-quick-status" : ""} ${showBulkQuickStatusEditor && quickStatusMenuOpen ? "is-status-menu-open" : ""}`}
      >
        <div className="editor-selection-bar">
          <button
            type="button"
            className="row-action-btn row-action-btn--pin row-action-btn--expand selection-action-btn"
            onClick={() => {
              pinSelectedOffers();
            }}
            title={allSelectedPinned ? t.unpin : t.pin}
            disabled={isQuickStatusLocked || !hasSelection}
          >
            <span className="row-action-btn__icon">📌</span>
            <span className="row-action-btn__label">{allSelectedPinned ? t.unpin : t.pin}</span>
          </button>
          <button
            type="button"
            className="row-action-btn row-action-btn--status row-action-btn--expand selection-action-btn"
            onClick={() => {
              if (firstSelected) openQuickStatus(firstSelected, "bulk");
            }}
            title={t.quickStatus}
            disabled={isQuickStatusLocked || !firstSelected}
          >
            <span className="row-action-btn__icon">?</span>
            <span className="row-action-btn__label">{t.quickStatus}</span>
          </button>
          <button
            type="button"
            className="row-action-btn row-action-btn--archive row-action-btn--expand selection-action-btn"
            onClick={() => {
              archiveSelectedOffers();
            }}
            title={allSelectedArchived ? t.restoreArchive : t.archive}
            disabled={isQuickStatusLocked || !hasSelection}
          >
            <span className="row-action-btn__icon">{allSelectedArchived ? "📂" : "🗃️"}</span>
            <span className="row-action-btn__label">{allSelectedArchived ? t.restoreArchive : t.archive}</span>
          </button>
          <button
            type="button"
            className="row-action-btn row-action-btn--delete row-action-btn--expand selection-action-btn"
            onClick={() => {
              openBulkDeleteConfirm();
            }}
            title={t.delete}
            disabled={isQuickStatusLocked || !hasSelection}
          >
            <span className="row-action-btn__icon">🗑️</span>
            <span className="row-action-btn__label">{t.delete}</span>
          </button>
          <button
            type="button"
            className="ghost-btn selection-clear-btn"
            onClick={() => {
              setSelectedRowIds([]);
              closeQuickStatusEditor();
            }}
            disabled={isQuickStatusLocked || !hasSelection}
          >
            {t.clearSelectionRows}
          </button>
        </div>
        {showBulkQuickStatusEditor ? (
          <div className="editor-selection-quick-status">
            <div className="quick-status-box">
              <div className={`quick-status-picker ${quickStatusMenuOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className={`quick-status-picker__trigger offer-status-pill offer-status-pill--${getOfferStatusTone(quickStatusValue)}`}
                  onClick={(event) => toggleQuickStatusMenu(event.currentTarget)}
                  aria-expanded={quickStatusMenuOpen}
                >
                  <span>{quickStatusValue}</span>
                  <span className="quick-status-picker__chevron">▾</span>
                </button>
              </div>
              <button type="button" onClick={() => submitQuickStatus(firstSelected)} disabled={loading}>
                {t.save}
              </button>
              <button type="button" className="ghost-btn" onClick={closeQuickStatusEditor}>
                {t.cancel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderOfferTools(isDocked: boolean) {
    const viewLabel = `👁 ${t.viewMode}: ${compactView ? t.viewCompact : t.viewFull}`;
    const filtersLabel = `⏷ ${t.filters}`;
    const searchLabel = `🔍 ${t.search}`;
    return (
      <div className={`offers-toolbar-stack ${isDocked ? "offers-toolbar-stack--docked" : ""}`}>
        <div className={`offers-toolbar-right ${isDocked ? "offers-toolbar-right--docked" : ""}`}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setCompactView((prev) => !prev)}
            aria-label={t.viewMode}
            title={t.viewMode}
            disabled={isQuickStatusLocked}
          >
            {viewLabel}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-label={t.filters}
            title={t.filters}
            disabled={isQuickStatusLocked}
          >
            {filtersLabel}
          </button>
          <div className={`toolbar-search-wrap ${showSearchInput ? "is-open" : ""}`}>
            <button
              type="button"
              className="ghost-btn toolbar-search-trigger"
              onClick={() => setShowSearchInput(true)}
              aria-label={t.search}
              title={t.search}
              disabled={isQuickStatusLocked}
            >
              {searchLabel}
            </button>
            <div className={`toolbar-search-box ${isDocked ? "toolbar-search-box--docked" : ""} ${showSearchInput ? "is-open" : ""}`}>
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
                ref={searchInputRef}
              />
            </div>
          </div>
        </div>
        {renderEditorSelectionBar()}
      </div>
    );
  }

  function renderOfferFilters(className = "offers-filters") {
    return (
      <div className={className}>
        <label className="form-field">
          <span>{t.filterByStatus}</span>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">{t.all}</option>
            <option value={ARCHIVED_FILTER_VALUE}>{t.archivedStatus}</option>
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
    );
  }

  async function handleAddOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addOfferMode === "manual") {
      const hasCompany = Boolean(offerForm.company?.trim());
      const hasLocation = Boolean(offerForm.location?.trim());
      const hasStatus = Boolean(offerForm.status?.trim());
      const hasAppliedAt = Boolean(offerForm.appliedAt?.trim());
      if (!hasCompany || !hasLocation || !hasStatus || !hasAppliedAt) {
        setStatusMessage(t.manualRequiredFields);
        return;
      }
    }
    setAddOfferOperationMessage(t.savingOffer);
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
      setAddOfferOperationMessage("");
      await Promise.all([fetchOffers(), fetchStats()]);
      setStatusMessage(t.offerAdded);
    } catch (error) {
      setShowAddOfferForm(true);
      setOfferForm((prev) => ({
        ...prev,
        sourceUrl: addOfferUrl || prev.sourceUrl
      }));
      setAddOfferOperationMessage(String(error));
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

    setAddOfferOperationMessage(t.processingLink);
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
      setAddOfferOperationMessage(t.linkFetched);
      setStatusMessage(t.linkFetched);
    } catch (error) {
      setAddOfferOperationMessage(String(error));
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleImportExcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      setImportOperationMessage(t.fileFirst);
      setStatusMessage(t.fileFirst);
      return;
    }

    resetImportAssistantState();
    setImportOperationMessage(t.processingImport);
    setLoading(true);
    try {
      if (importTarget === "offers" && importFormat === "xlsx") {
        const formData = new FormData();
        formData.append("file", importFile);

        const response = await fetch("/api/offers/import-excel/preview", {
          method: "POST",
          body: formData
        });

        const data = (await response.json()) as {
          ok: boolean;
          imported?: number;
          skipped?: number;
          offers?: Offer[];
          issues?: ExcelImportIssue[];
          _meta?: ImportPreviewMeta;
          error?: string;
        };
        if (!data.ok) {
          throw new Error(data.error || t.excelImportFailed);
        }

        setImportFile(null);
        setShowImportModal(false);
        setImportOperationMessage("");
        const importedCount = data.imported ?? 0;
        const skippedCount = data.skipped ?? 0;
        openImportSummary(data.offers || [], importedCount, skippedCount, data.issues || [], data._meta || null);
        setStatusMessage(
          t.importWarningSummary
            .replace("{imported}", String(importedCount))
            .replace("{skipped}", String(skippedCount))
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

        setImportFile(null);
        setShowImportModal(false);
        setImportOperationMessage("");
        const normalizedOffers = entries.map((entry) => normalizeImportEntryToOffer(entry as Partial<Offer>));
        openImportSummary(normalizedOffers, normalizedOffers.length, 0, [], null);
        setStatusMessage(
          t.importWarningSummary
            .replace("{imported}", String(normalizedOffers.length))
            .replace("{skipped}", "0")
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
        setImportOperationMessage("");
        setStatusMessage(t.importSuccess);
        return;
      }

      throw new Error(t.unsupportedImportCombo);
    } catch (error) {
      setImportOperationMessage(String(error));
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSelectedImported() {
    if (selectedImportedOfferIds.length === 0) return;
    setImportedPreviewOffers((prev) =>
      prev.filter((_, index) => !selectedImportedOfferIds.includes(index))
    );
    setSelectedImportedOfferIds([]);
    setConfirmDuplicateImport(false);
  }

  async function handleConfirmImport() {
    if (importedPreviewOffers.length === 0) {
      setStatusMessage(t.noImportedRows);
      return;
    }
    if (hasUnresolvedCompanyFormulaIssues) {
      setStatusMessage(t.unresolvedCompanyFormulaImportBlocked);
      return;
    }
    if (hasDuplicateImports && !confirmDuplicateImport) {
      const accepted = window.confirm(
        t.duplicateImportConfirmPrompt.replace("{count}", String(duplicateImportIndexes.length))
      );
      if (!accepted) {
        setStatusMessage(t.duplicateImportBlocked);
        return;
      }
      setConfirmDuplicateImport(true);
    }
    setImportOperationMessage(t.processingImport);
    setLoading(true);
    try {
      let importedCount = 0;
      let skippedCount = 0;
      for (const offer of importedPreviewOffers) {
        const response = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...offer,
            applied: inferAppliedFromStatus(offer.status),
          }),
        });
        const data = (await response.json()) as { ok: boolean };
        if (data.ok) importedCount += 1;
        else skippedCount += 1;
      }

      await Promise.all([fetchOffers(), fetchStats()]);
      setShowImportSummaryModal(false);
      setImportedPreviewOffers([]);
      setSelectedImportedOfferIds([]);
      if ((pendingImportIssues || []).length > 0) {
        setExportAssistantRows(buildExportAssistantRows(pendingImportIssues));
        setActiveAssistantIndex(0);
        setShowImportAssistantPrompt(true);
      }
      setImportOperationMessage("");
      setPendingImportIssues([]);
      setImportSummary(null);
      setImportPreviewMeta(null);
      setStatusMessage(
        t.excelImported
          .replace("{imported}", String(importedCount))
          .replace("{skipped}", String(skippedCount))
      );
    } catch (error) {
      setImportOperationMessage(String(error));
      setStatusMessage(String(error));
    } finally {
      setLoading(false);
    }
  }

  function buildExportAssistantRows(issues: ExcelImportIssue[]): ExportAssistantRow[] {
    return issues.map((issue, index) => {
      const parsed = issue.parsed || {};
      const status = normalizeOfferStatus(parsed.status, true);
      return {
        rowNumber: Number(issue.rowNumber || index + 1),
        raw: issue.raw || {},
        missingFields: issue.missingFields || [],
        saved: false,
        draft: {
          ...createDefaultOffer(),
          company: String(parsed.company || ""),
          role: String(parsed.role || ""),
          status,
          applied: inferAppliedFromStatus(status),
          location: String(parsed.location || ""),
          appliedAt: parsed.appliedAt || getTodayDate(),
          source: String(parsed.source || "import_excel"),
          sourceUrl: String(parsed.sourceUrl || ""),
          notes: String(parsed.notes || ""),
        },
      };
    });
  }

  function selectAssistantRow(index: number) {
    setActiveAssistantIndex(index);
    requestAnimationFrame(() => {
      if (assistantRawWindowRef.current) {
        assistantRawWindowRef.current.scrollTop = 0;
      }
      if (assistantEditWindowRef.current) {
        assistantEditWindowRef.current.scrollTop = 0;
      }
    });
  }

  async function saveAssistantRow(index: number) {
    const row = exportAssistantRows[index];
    if (!row) return;
    if (!row.draft.company.trim() || !row.draft.role.trim()) return;

    const payload = { ...row.draft, applied: inferAppliedFromStatus(row.draft.status) };
    const response = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(data.error || t.offerAddFailed);
    }

    setExportAssistantRows((prev) =>
      prev.map((item, rowIndex) => (rowIndex === index ? { ...item, saved: true } : item))
    );
  }

  async function handleSaveAllAssistantRows() {
    setLoading(true);
    try {
      let savedCount = 0;
      for (let i = 0; i < exportAssistantRows.length; i += 1) {
        const row = exportAssistantRows[i];
        if (row.saved) continue;
        if (!row.draft.company.trim() || !row.draft.role.trim()) continue;
        // eslint-disable-next-line no-await-in-loop
        await saveAssistantRow(i);
        savedCount += 1;
      }
      await Promise.all([fetchOffers(), fetchStats()]);
      setStatusMessage(t.exportAssistantSaved.replace("{count}", String(savedCount)));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (exportTarget === "offers" && exportFormat === "xlsx") {
        const userUtcOffsetMinutes = -new Date().getTimezoneOffset();
        window.open(`/api/offers/export-excel?tzOffsetMinutes=${userUtcOffsetMinutes}`, "_blank");
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
          archive: false,
          status: "Wyslano",
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
      archive: false,
      status: "Wyslano",
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

  async function handleToggleArchiveOfferDetails() {
    if (!selectedOfferDraft?.id) return;
    const nextArchiveValue = selectedOfferDraft.archive !== true;
    setLoading(true);
    try {
      await updateOfferArchiveQuick(selectedOfferDraft, nextArchiveValue);
      await Promise.all([fetchOffers(), fetchStats()]);
      const normalized = normalizeOfferForEdit({ ...selectedOfferDraft, archive: nextArchiveValue });
      setSelectedOffer(normalized);
      setSelectedOfferDraft(normalized);
      setEditingSelectedOffer(false);
      setStatusMessage(nextArchiveValue ? t.archived : t.restored);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteOfferDetails() {
    if (!selectedOffer?.id) return;

    setLoading(true);
    try {
      await runWithRowExitAnimation([selectedOffer.id], "delete", async () => {
        const response = await fetch(`/api/offers/${selectedOffer.id}`, {
          method: "DELETE",
        });
        const data = (await response.json()) as { ok: boolean; error?: string };
        if (!data.ok) {
          throw new Error(data.error || t.offerAddFailed);
        }
        await Promise.all([fetchOffers(), fetchStats()]);
      });
      closeOfferDetails();
      setStatusMessage(t.deleted);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  function openBulkDeleteConfirm() {
    if (selectedRowIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  }

  async function confirmDeleteSelectedOffers() {
    const ids = selectedRowIds.filter((id) => typeof id === "number");
    if (!ids.length) {
      setShowBulkDeleteConfirm(false);
      return;
    }
    setLoading(true);
    try {
      await runWithRowExitAnimation(ids, "delete", async () => {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const response = await fetch(`/api/offers/${id}`, { method: "DELETE" });
            const data = (await response.json()) as { ok: boolean; error?: string };
            if (!data.ok) {
              throw new Error(data.error || t.offerAddFailed);
            }
          })
        );
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length > 0) {
          const reason = (failed[0] as PromiseRejectedResult).reason;
          throw new Error(reason instanceof Error ? reason.message : String(reason));
        }
        await Promise.all([fetchOffers(), fetchStats()]);
      });
      setSelectedRowIds([]);
      setShowBulkDeleteConfirm(false);
      setStatusMessage(t.deleted);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app" id="top">
      <header className="header app-bar" ref={headerRef}>
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
          {offers.length > 0 ? (
            <>
              <button
                type="button"
                className={`edit-offer-btn edit-offer-btn--compact action-mini-btn ${editorMode ? "is-active edit-offer-btn--mode" : ""}`}
                onClick={toggleEditorMode}
                aria-label={t.edit}
              >
                {editorMode ? (
                  <span className="edit-mode-label">{t.editorModeLabel}</span>
                ) : (
                  <>
                    <span className="action-mini-content action-mini-content--icon" aria-hidden="true">
                      <svg className="action-mini-icon" viewBox="0 0 24 24">
                        <path
                          d="M21.2 18.4 15 12.2a5.6 5.6 0 0 1-7.2-7.2l2.7 2.7 2.7-2.7L10.5 2.3a5.6 5.6 0 0 1 7.2 7.2l6.2 6.2a1.9 1.9 0 0 1-2.7 2.7Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="action-mini-content action-mini-content--label">{t.edit}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="add-offer-btn add-offer-btn--compact action-mini-btn"
                onClick={toggleAddOfferModal}
                aria-label={t.addOffer}
              >
                <span className="action-mini-content action-mini-content--icon action-mini-plus">+</span>
                <span className="action-mini-content action-mini-content--label">{t.addOffer}</span>
              </button>
            </>
          ) : null}
          <div className="menu-wrap">
            <button
              type="button"
              className="ghost-btn icon-btn notify-btn action-mini-btn"
              onClick={() => {
                const next = !showNotificationsMenu;
                setShowNotificationsMenu(next);
                setShowSettingsMenu(false);
                setShowUserMenu(false);
                if (next) {
                  setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
                }
              }}
              aria-label={t.notificationBell}
              title={t.notificationBell}
            >
              <span className="action-mini-content action-mini-content--icon" aria-hidden="true">
                🔔
              </span>
              <span className="action-mini-content action-mini-content--label">{t.notifications}</span>
              {unreadNotificationsCount > 0 ? (
                <span className="notify-badge">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>
              ) : null}
            </button>
            {showNotificationsMenu ? (
              <div className="menu-panel notifications-panel">
                <strong>{t.notifications}</strong>
                {visibleMenuNotifications.length === 0 ? (
                  <p className="hint">{t.noNotifications}</p>
                ) : (
                  <div className="notifications-list">
                    {visibleMenuNotifications.map((item) => (
                      <div
                        key={item.id}
                        className={`notification-item notification-item--${item.tone} ${item.menuClosing ? "notification-item--closing" : ""}`}
                      >
                        <div className="notification-item-content">
                          <span className="notification-kind">
                            {item.kind === "operational" ? t.notificationKindOperational : "-"}
                          </span>
                          <p>{item.text}</p>
                        </div>
                        <button
                          type="button"
                          className={`toast-close toast-close--${item.tone} notification-item-close`}
                          onClick={() => dismissMenuNotification(item.id)}
                          aria-label={t.close}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="menu-wrap">
            <button
              type="button"
              className="ghost-btn user-menu-trigger"
              onClick={() => {
                setShowUserMenu((prev) => !prev);
                setShowNotificationsMenu(false);
                setShowSettingsMenu(false);
                setShowDataManagementMenu(false);
              }}
            >
              {t.user}
            </button>
            {showUserMenu ? (
              <div className="menu-panel">
                <button
                  type="button"
                  className="ghost-btn menu-toggle-btn"
                  onClick={() => {
                    setShowSettingsMenu((prev) => !prev);
                    setShowDataManagementMenu(false);
                  }}
                >
                  <span>{t.settings}</span>
                  <span>{showSettingsMenu ? "▴" : "▾"}</span>
                </button>
                {showSettingsMenu ? (
                  <div className="menu-subpanel">
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
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowPreferences(true);
                    setShowImportModal(false);
                    setShowExportModal(false);
                    setShowUserMenu(false);
                    setShowSettingsMenu(false);
                    setShowDataManagementMenu(false);
                  }}
                >
                  {t.preferences}
                </button>
                <button
                  type="button"
                  className="ghost-btn menu-toggle-btn"
                  onClick={() => {
                    setShowDataManagementMenu((prev) => !prev);
                    setShowSettingsMenu(false);
                  }}
                >
                  <span>{t.dataManagement}</span>
                  <span>{showDataManagementMenu ? "▴" : "▾"}</span>
                </button>
                {showDataManagementMenu ? (
                  <div className="menu-subpanel">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        resetImportAssistantState();
                        setShowImportModal(true);
                        setShowExportModal(false);
                        setShowUserMenu(false);
                        setShowDataManagementMenu(false);
                      }}
                    >
                      {t.importData}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setShowExportModal(true);
                        setShowImportModal(false);
                        setShowUserMenu(false);
                        setShowDataManagementMenu(false);
                      }}
                    >
                      {t.exportData}
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowAboutModal(true);
                    setShowUserMenu(false);
                    setShowSettingsMenu(false);
                    setShowDataManagementMenu(false);
                  }}
                >
                  {t.about}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {activeTopTab === "offers" && offers.length > 0 && dockOfferToolsToHeader && !isHeaderMenuOpen ? (
          <>
            <div className={`header-docked-filters ${showFilters ? "is-open" : "is-closed"}`}>
              {renderOfferFilters("offers-filters offers-filters--docked-island")}
            </div>
            <div className={`header-docked-tools ${showFilters ? "header-docked-tools--below-filters" : ""}`}>
              {renderOfferTools(true)}
            </div>
          </>
        ) : null}
      </header>
      {activeTopTab === "offers" && offers.length > 0 && dockOfferToolsToHeader && !isHeaderMenuOpen ? (
        <div
          className={`header-docked-spacer ${showFilters ? "header-docked-spacer--with-filters" : ""}`}
          aria-hidden="true"
        />
      ) : null}

      {visibleCenterNotifications.length > 0 ? (
        <div
          className="toast-stack toast-stack--center"
          aria-live="assertive"
          aria-atomic="false"
        >
          {visibleCenterNotifications.map((item) => (
            <div
              key={`center-${item.id}`}
              className={`toast toast--${item.tone} ${item.surfaceClosing ? "toast--closing" : ""}`}
            >
              <div>
                <span className="notification-kind">
                  {item.kind === "operational" ? t.notificationKindOperational : "-"}
                </span>
                <p>{item.text}</p>
              </div>
              <button
                type="button"
                className={`toast-close toast-close--${item.tone}`}
                onClick={() => dismissSurfaceNotification(item.id)}
                aria-label={t.close}
              >
                X
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {visibleToastNotifications.map((item) => (
            <div
              key={`toast-${item.id}`}
              className={`toast toast--${item.tone} ${item.surfaceClosing ? "toast--closing" : ""}`}
            >
              <div>
                <span className="notification-kind">
                  {item.kind === "operational" ? t.notificationKindOperational : "-"}
                </span>
                <p>{item.text}</p>
              </div>
              <button
                type="button"
                className={`toast-close toast-close--${item.tone}`}
                onClick={() => dismissSurfaceNotification(item.id)}
                aria-label={t.close}
              >
                X
              </button>
            </div>
          ))}
      </div>

      {activeTopTab === "offers" ? (
        offers.length === 0 ? (
          <section className="empty-state-landing" id="offers-empty">
            <div className="empty-state-card">
              <h2>{t.noOffersLandingTitle}</h2>
              <p>{t.noOffersLandingBody}</p>
              <div className="empty-state-actions">
                <button type="button" className="add-offer-btn" onClick={openAddOfferModal}>
                  {t.addOffer}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setImportTarget("offers");
                    setImportFormat("xlsx");
                    resetImportAssistantState();
                    setShowImportModal(true);
                    setShowExportModal(false);
                    setShowUserMenu(false);
                  }}
                >
                  {t.openImportManager}
                </button>
              </div>
            </div>
          </section>
        ) : (
        <section className="card offers-card" id="offers-list" ref={offersSectionRef}>
          <div className="offers-head">
            <div className="offers-head-left">
              <h2>{t.offers} ({visibleOffers.length}/{offers.length})</h2>
              {editorMode && selectedRowIds.length > 0 ? (
                <div className="offers-selection-summary-left">
                  {t.selectedRows}: {selectedRowIds.length}
                </div>
              ) : null}
            </div>
            <div className="offers-toolbar" ref={offersToolbarRef}>
              {!dockOfferToolsToHeader ? renderOfferTools(false) : null}
            </div>
          </div>

          {!dockOfferToolsToHeader ? (
            <div className={`offers-filters-inline ${showFilters ? "is-open" : "is-closed"}`}>
              {renderOfferFilters()}
            </div>
          ) : null}

          {visibleOffers.length === 0 ? (
            <p className="hint">{offers.length === 0 ? t.noOffers : t.noFilterResults}</p>
          ) : (
            <div className="offers-table-wrap offers-table-wrap--overlay">
              <div className="offers-table-scroll">
              <table className={`offers-table ${compactView ? "offers-table--compact" : ""}`}>
                <thead>
                  <tr>
                    <th>
                      <button type="button" className={getSortButtonClass("role")} onClick={() => toggleSort("role", "text")}>
                        {t.role}{getSortIndicator("role")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className={getSortButtonClass("company")} onClick={() => toggleSort("company", "text")}>
                        {t.company}{getSortIndicator("company")}
                      </button>
                    </th>
                    <th>
                      <button type="button" className={getSortButtonClass("status")} onClick={() => toggleSort("status", "text")}>
                        {t.status}{getSortIndicator("status")}
                      </button>
                    </th>
                    {!compactView ? (
                      <th>
                      <button type="button" className={getSortButtonClass("location")} onClick={() => toggleSort("location", "text")}>
                        {t.location}{getSortIndicator("location")}
                      </button>
                      </th>
                    ) : null}
                    <th>
                      <button type="button" className={getSortButtonClass("appliedAt")} onClick={() => toggleSort("appliedAt", "date")}>
                        {t.appliedAt}{getSortIndicator("appliedAt")}
                      </button>
                    </th>
                    {!compactView ? (
                      <th>
                      <button type="button" className={getSortButtonClass("datePosted")} onClick={() => toggleSort("datePosted", "date")}>
                        Data publikacji{getSortIndicator("datePosted")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className={getSortButtonClass("expiresAt")} onClick={() => toggleSort("expiresAt", "date")}>
                        Wygasa{getSortIndicator("expiresAt")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className={getSortButtonClass("daysToExpire")} onClick={() => toggleSort("daysToExpire", "number")}>
                        Dni do końca{getSortIndicator("daysToExpire")}
                      </button>
                      </th>
                    ) : null}
                    {!compactView ? (
                      <th>
                      <button type="button" className={getSortButtonClass("source")} onClick={() => toggleSort("source", "text")}>
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
                <tbody className={`offers-table-body ${sortAnimating ? "offers-table-body--sorting" : ""}`}>
                  {visibleOffers.map((offer, index) => {
                    const rowId = offer.id || null;
                    const rowExitKind = rowId !== null ? rowExitAnimations[rowId] : undefined;
                    const isRowExiting = Boolean(rowExitKind);
                    const isQuickStatusRow = rowId !== null && quickStatusOfferId === rowId;
                    const canInteractWithRow = !isQuickStatusLocked || isQuickStatusRow;
                    const hasSelection = selectedRowIds.length > 0;
                    const isBulkQuickStatusActive = hasSelection && quickStatusMode === "bulk" && quickStatusOfferId !== null;
                    const shouldShowRowHoverPanel =
                      editorMode &&
                      !isRowExiting &&
                      canInteractWithRow &&
                      !isBulkQuickStatusActive &&
                      (!hasSelection || isQuickStatusRow) &&
                      (hoveredOfferId === rowId || isQuickStatusRow);
                    const keepRowHoverPanelMounted = shouldShowRowHoverPanel || closingHoverPanelRowId === rowId;
                    const isPanelRow = keepRowHoverPanelMounted || isQuickStatusRow;
                    return (
                    <tr
                      key={`${offer.id || "offer"}-${index}`}
                      className={`clickable-row ${editorMode ? "clickable-row--editor" : ""} ${selectedRowIds.includes(offer.id || -1) ? "clickable-row--selected" : ""} ${isPanelRow ? "clickable-row--panel-open" : ""} ${isRowExiting ? "clickable-row--exit" : ""} ${rowExitKind === "archive" ? "clickable-row--exit-archive" : ""} ${rowExitKind === "delete" ? "clickable-row--exit-delete" : ""}`}
                      onMouseEnter={() => {
                        if (isRowExiting) return;
                        handleEditorRowMouseEnter(rowId, canInteractWithRow);
                      }}
                      onMouseLeave={() => {
                        if (isRowExiting) return;
                        handleEditorRowMouseLeave(rowId, canInteractWithRow);
                      }}
                      onClick={(event) => {
                        if (isRowExiting) return;
                        if (editorMode) {
                          const target = event.target as HTMLElement;
                          if (
                            target.closest("button") ||
                            target.closest("select") ||
                            target.closest("a")
                          ) {
                            return;
                          }
                          if (!canInteractWithRow) return;
                          toggleRowSelection(offer);
                          return;
                        }
                        openOfferDetails(offer);
                      }}
                    >
                      <td>
                        {offer.sourceUrl ? (
                          <a
                            href={offer.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {pinnedOfferIds.includes((offer.id as number) || -1) ? <span className="pinned-indicator" aria-label={t.pin}>📌</span> : null}
                            {offer.archive === true ? <span className="archived-indicator" aria-label={t.archivedStatus}>🗃️</span> : null}
                            <span className="role-cell-text">{offer.role || "-"}</span>
                          </a>
                        ) : (
                          <>
                            {pinnedOfferIds.includes((offer.id as number) || -1) ? <span className="pinned-indicator" aria-label={t.pin}>📌</span> : null}
                            {offer.archive === true ? <span className="archived-indicator" aria-label={t.archivedStatus}>🗃️</span> : null}
                            <span className="role-cell-text">{offer.role || "-"}</span>
                          </>
                        )}
                      </td>
                      <td>{offer.company || "-"}</td>
                      <td>
                        <span className={`offer-status-pill offer-status-pill--${getOfferStatusTone(offer.status)}`}>
                          {offer.status || "-"}
                        </span>
                        {keepRowHoverPanelMounted ? (
                          <div
                            className={`row-hover-panel ${shouldShowRowHoverPanel ? "is-open" : "is-closing"}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="editor-hover-bar">
                              <button
                                type="button"
                                className="row-action-btn row-action-btn--pin row-action-btn--expand"
                                onClick={() => togglePinOffer(offer)}
                                title={pinnedOfferIds.includes((offer.id as number) || -1) ? t.unpin : t.pin}
                              >
                                <span className="row-action-btn__icon">📌</span>
                                <span className="row-action-btn__label">
                                  {pinnedOfferIds.includes((offer.id as number) || -1) ? t.unpin : t.pin}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn row-action-btn--edit row-action-btn--expand"
                                onClick={() => openOfferDetails(offer)}
                                title={t.edit}
                              >
                                <span className="row-action-btn__icon">✏️</span>
                                <span className="row-action-btn__label">{t.edit}</span>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn row-action-btn--status row-action-btn--expand"
                                onClick={(event) => openQuickStatus(offer, "single", event.currentTarget)}
                                title={t.quickStatus}
                              >
                                <span className="row-action-btn__icon">?</span>
                                <span className="row-action-btn__label">{t.quickStatus}</span>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn row-action-btn--archive row-action-btn--expand"
                                onClick={() => archiveOffer(offer)}
                                title={offer.archive === true ? t.restoreArchive : t.archive}
                              >
                                <span className="row-action-btn__icon">{offer.archive === true ? "📂" : "🗃️"}</span>
                                <span className="row-action-btn__label">{offer.archive === true ? t.restoreArchive : t.archive}</span>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn row-action-btn--delete row-action-btn--expand"
                                onClick={() => openDeleteFromRow(offer)}
                                title={t.delete}
                              >
                                <span className="row-action-btn__icon">🗑️</span>
                                <span className="row-action-btn__label">{t.delete}</span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                      {!compactView ? <td>{getPrimaryLocation(offer.location)}</td> : null}
                      <td>{offer.appliedAt || "-"}</td>
                      {!compactView ? <td>{offer.datePosted || "-"}</td> : null}
                      {!compactView ? <td>{offer.expiresAt || "-"}</td> : null}
                      {!compactView ? (
                        <td>
                          <span className={`offer-status-pill offer-status-pill--${getExpiryTone(offer.daysToExpire)}`}>
                            {formatDaysToExpire(offer.daysToExpire)}
                          </span>
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
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>
        )
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
            {addOfferOperationMessage ? <p className="hint operation-hint">{addOfferOperationMessage}</p> : null}

            {showAddOfferForm || addOfferMode === "manual" ? (
              <form className="grid" onSubmit={handleAddOffer}>
                <label className="form-field">
                  <span>{t.company}*</span>
                  <input
                    value={offerForm.company}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, company: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>{t.role}{addOfferMode === "manual" ? "" : "*"}</span>
                  <input
                    value={offerForm.role}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, role: event.target.value }))}
                    required={addOfferMode !== "manual"}
                  />
                </label>
                <label className="form-field">
                  <span>{t.status}*</span>
                  <select
                    value={offerForm.status}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, status: event.target.value }))}
                    required
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>{t.location}*</span>
                  <input
                    value={offerForm.location || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))}
                    required={addOfferMode === "manual"}
                  />
                </label>
                <label className="form-field">
                  <span>{t.appliedAt}*</span>
                  <input
                    type="date"
                    value={offerForm.appliedAt || ""}
                    onChange={(event) => setOfferForm((prev) => ({ ...prev, appliedAt: event.target.value }))}
                    required={addOfferMode === "manual"}
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
                <p className="required-note span-2">{t.requiredFieldsLegend}</p>
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

      {quickStatusMenuOpen && quickStatusMenuPos
        ? createPortal(
            <div
              className="quick-status-picker__menu quick-status-picker__menu--portal"
              style={{
                top: `${quickStatusMenuPos.top}px`,
                left: `${quickStatusMenuPos.left}px`,
                minWidth: `${quickStatusMenuPos.minWidth}px`,
              }}
            >
              {STATUS_OPTIONS.map((status) => {
                const tone = getOfferStatusTone(status);
                return (
                  <button
                    key={status}
                    type="button"
                    className={`quick-status-picker__option offer-status-pill offer-status-pill--${tone} ${quickStatusValue === status ? "is-active" : ""}`}
                    onClick={() => {
                      setQuickStatusValue(status);
                      setQuickStatusMenuOpen(false);
                      setQuickStatusMenuPos(null);
                    }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}

      {quickStatusMode === "single" && quickStatusOfferId !== null && quickStatusBoxPos
        ? createPortal(
            <div
              className="quick-status-box quick-status-box--portal"
              style={{
                top: `${quickStatusBoxPos.top}px`,
                left: `${quickStatusBoxPos.left}px`,
              }}
            >
              <div className={`quick-status-picker ${quickStatusMenuOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className={`quick-status-picker__trigger offer-status-pill offer-status-pill--${getOfferStatusTone(quickStatusValue)}`}
                  onClick={(event) => toggleQuickStatusMenu(event.currentTarget)}
                  aria-expanded={quickStatusMenuOpen}
                >
                  <span>{quickStatusValue}</span>
                  <span className="quick-status-picker__chevron">▾</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = findOfferById(quickStatusOfferId);
                  if (target) submitQuickStatus(target);
                }}
                disabled={loading}
              >
                {t.save}
              </button>
              <button type="button" className="ghost-btn" onClick={closeQuickStatusEditor}>
                {t.cancel}
              </button>
            </div>,
            document.body
          )
        : null}

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
                  value={normalizeOfferStatus(selectedOfferDraft.status, selectedOfferDraft.applied !== false)}
                  onChange={(event) => setSelectedOfferDraft((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                  disabled={!editingSelectedOffer}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
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
                {!editingSelectedOffer ? (
                  <button
                    type="button"
                    className="archive-btn"
                    onClick={handleToggleArchiveOfferDetails}
                    disabled={loading}
                  >
                    {selectedOfferDraft.archive === true ? t.restoreArchive : t.archive}
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

      {showBulkDeleteConfirm ? (
        <div className="modal-backdrop">
          <div className="modal" id="delete-bulk-confirm-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowBulkDeleteConfirm(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.confirmDeleteTitle}</h3>
            <p>{t.confirmBulkDeleteText}</p>
            <div className="list">
              {selectedRowIds
                .map((id) => findOfferById(id))
                .filter((offer): offer is Offer => Boolean(offer))
                .slice(0, 5)
                .map((offer) => (
                  <p key={offer.id || `${offer.company}-${offer.role}`}>
                    <strong>{offer.company || "-"}</strong> - <strong>{offer.role || "-"}</strong>
                  </p>
                ))}
              {selectedRowIds.length > 5 ? <p>... +{selectedRowIds.length - 5}</p> : null}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={loading}
              >
                {t.confirmDeleteNo}
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={confirmDeleteSelectedOffers}
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

      {showImportAssistantPrompt ? (
        <div className="modal-backdrop">
          <div className="modal" id="export-assistant-prompt-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowImportAssistantPrompt(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.exportAssistantPromptTitle}</h3>
            <p>{t.exportAssistantPromptBody}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowImportAssistantPrompt(false)}
              >
                {t.skipExportAssistant}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportAssistantPrompt(false);
                  setShowExportAssistant(true);
                }}
              >
                {t.openExportAssistant}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showExportAssistant ? (
        <div className="modal-backdrop">
          <div className="export-assistant-shell" id="export-assistant-modal">
            <aside
              className="modal export-assistant-window export-assistant-window--raw"
              ref={assistantRawWindowRef}
            >
              <h3>{t.exportAssistantRaw}</h3>
              {exportAssistantRows.length === 0 ? (
                <p className="hint">{t.exportAssistantNoRows}</p>
              ) : (
                <>
                  <div className="export-assistant-list">
                    {exportAssistantRows.map((row, index) => (
                      <button
                        key={`${row.rowNumber}-${index}`}
                        type="button"
                        className={`ghost-btn export-assistant-row-btn ${index === activeAssistantIndex ? "export-assistant-row-btn--active" : ""}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectAssistantRow(index)}
                      >
                        #{row.rowNumber} {row.saved ? "✓" : ""}
                      </button>
                    ))}
                  </div>
                  <div className="export-assistant-summary">
                    <p>
                      <strong>Wiersz:</strong> #{exportAssistantRows[activeAssistantIndex]?.rowNumber || "-"}
                    </p>
                    <p>
                      <strong>Brakujace pola:</strong>
                    </p>
                    <div className="export-assistant-missing-list">
                      {(exportAssistantRows[activeAssistantIndex]?.missingFields || []).map((field) => (
                        <span key={field} className="export-assistant-missing-chip">
                          {getAssistantFieldLabel(field)}
                        </span>
                      ))}
                      {(exportAssistantRows[activeAssistantIndex]?.missingFields || []).length === 0 ? (
                        <span className="hint">Brak</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="export-assistant-quick-grid">
                    {(["company", "role", "location", "status", "source"] as const).map((field) => {
                      const row = exportAssistantRows[activeAssistantIndex];
                      const value = String((row?.draft as unknown as Record<string, unknown>)?.[field] || "-");
                      const isMissing = (row?.missingFields || []).includes(field);
                      return (
                        <div
                          key={field}
                          className={`export-assistant-quick-item ${isMissing ? "export-assistant-quick-item--missing" : ""}`}
                        >
                          <span>{getAssistantFieldLabel(field)}</span>
                          <strong>{value || "-"}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <details className="export-assistant-raw-details">
                    <summary>Pokaz surowy JSON</summary>
                    <pre className="export-assistant-raw-box">
                      {JSON.stringify(exportAssistantRows[activeAssistantIndex]?.raw || {}, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </aside>

            <section
              className="modal export-assistant-window export-assistant-window--edit"
              ref={assistantEditWindowRef}
            >
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowExportAssistant(false)}
                aria-label={t.close}
              >
                X
              </button>
              <h3>{t.exportAssistantTitle}</h3>
              <h4>{t.exportAssistantEdit}</h4>
              {exportAssistantRows[activeAssistantIndex] ? (
                <form
                  className="grid"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setLoading(true);
                    try {
                      await saveAssistantRow(activeAssistantIndex);
                      await Promise.all([fetchOffers(), fetchStats()]);
                      setStatusMessage(t.exportAssistantSaved.replace("{count}", "1"));
                    } catch (error) {
                      setStatusMessage(String(error));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {(["company", "role", "location", "status", "source", "sourceUrl", "notes"] as const).map((field) => {
                    const row = exportAssistantRows[activeAssistantIndex];
                    const missing = row.missingFields.includes(field);
                    const value = String((row.draft as unknown as Record<string, unknown>)[field] || "");
                    return (
                      <label key={field} className={`form-field ${missing ? "form-field--missing" : ""}`}>
                        <span>{field}</span>
                        <input
                          value={value}
                          onChange={(event) =>
                            setExportAssistantRows((prev) =>
                              prev.map((item, idx) =>
                                idx === activeAssistantIndex
                                  ? {
                                      ...item,
                                      draft: {
                                        ...item.draft,
                                        [field]: event.target.value,
                                      } as Offer,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </label>
                    );
                  })}
                  <div className="modal-actions span-2">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setShowExportAssistant(false)}
                    >
                      {t.close}
                    </button>
                    <button type="button" className="ghost-btn" onClick={handleSaveAllAssistantRows} disabled={loading}>
                      {t.exportAssistantSaveAll}
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !exportAssistantRows[activeAssistantIndex].draft.company.trim() ||
                        !exportAssistantRows[activeAssistantIndex].draft.role.trim()
                      }
                    >
                      {t.exportAssistantSaveRow}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="hint">{t.exportAssistantNoRows}</p>
              )}
            </section>
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
            {importOperationMessage ? <p className="hint operation-hint">{importOperationMessage}</p> : null}
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
                  accept={importFormat === "xlsx" ? ".xlsx" : ".json"}
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

      {showImportSummaryModal ? (
        <div className="modal-backdrop">
          <div className="modal" id="import-summary-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowImportSummaryModal(false)}
              aria-label={t.close}
            >
              X
            </button>
            <h3>{t.importSummaryTitle}</h3>
            {importOperationMessage ? <p className="hint operation-hint">{importOperationMessage}</p> : null}
            <p className="hint">
              {t.importedRecords}: {importSummary?.imported ?? 0} | {t.skippedRecords}: {importSummary?.skipped ?? 0}
            </p>
            {importPreviewMeta?.filename ? (
              <p className="hint">
                {t.importPreviewFile}: {importPreviewMeta.filename}
                {importPreviewMeta.sha256 ? ` | sha256: ${importPreviewMeta.sha256.slice(0, 12)}...` : ""}
              </p>
            ) : null}
            {hasUnresolvedCompanyFormulaIssues ? (
              <p className="hint operation-hint">
                {t.unresolvedCompanyFormulaImportBlocked}
              </p>
            ) : null}
            {hasDuplicateImports ? (
              <div className="hint operation-hint">
                <p>
                  {t.duplicateRowsDetected.replace("{count}", String(duplicateImportIndexes.length))}
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={confirmDuplicateImport}
                    onChange={(event) => setConfirmDuplicateImport(event.target.checked)}
                  />
                  <span>{t.duplicateConfirmImport}</span>
                </label>
              </div>
            ) : null}

            {importedPreviewOffers.length > 0 ? (
              <>
                <div className="row">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={loading || importedPreviewOffers.length === 0 || hasUnresolvedCompanyFormulaIssues}
                  >
                    {t.importNow}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setSelectedImportedOfferIds(importedPreviewOffers.map((_, index) => index))}
                  >
                    {t.selectAll}
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setSelectedImportedOfferIds([])}>
                    {t.unselectAll}
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={handleDeleteSelectedImported}
                    disabled={loading || selectedImportedOfferIds.length === 0}
                  >
                    {t.deleteSelectedImported}
                  </button>
                </div>
                <div className="offers-table-wrap">
                  <table className="offers-table">
                    <thead>
                      <tr>
                        <th />
                        <th>{t.company}</th>
                        <th>{t.role}</th>
                        <th>{t.status}</th>
                        <th>{t.appliedAt}</th>
                        <th>{t.source}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedPreviewOffers.map((offer, index) => {
                        const checked = selectedImportedOfferIds.includes(index);
                        return (
                          <tr key={`import-preview-${index}`}>
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedImportedOfferIds((prev) => Array.from(new Set([...prev, index])));
                                  } else {
                                    setSelectedImportedOfferIds((prev) => prev.filter((id) => id !== index));
                                  }
                                }}
                              />
                            </td>
                            <td>{offer.company || "-"}</td>
                            <td>
                              {offer.role || "-"}
                              {duplicateImportIndexSet.has(index) ? (
                                <span className="hint"> ({t.duplicateLabel})</span>
                              ) : null}
                            </td>
                            <td>{offer.status || "-"}</td>
                            <td>{offer.appliedAt || "-"}</td>
                            <td>{offer.source || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="hint">{t.noImportedRows}</p>
            )}
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
      {showAboutModal ? (
        <div className="modal-backdrop">
          <div className="modal" id="about-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setShowAboutModal(false);
                setShowRoadmap(false);
              }}
              aria-label={t.close}
            >
              X
            </button>
            <h3 className="about-app-name">{t.aboutAppName}</h3>
            <div className="about-modal-content">
              <p>
                <strong>{t.aboutVersionLabel}</strong> {t.aboutVersionValue}
              </p>
              <p>
                <strong>{t.aboutReleaseDateLabel}</strong> {aboutReleaseDate}
              </p>
              <p>
                <strong>{t.aboutAuthorLabel}</strong>{" "}
                <a href="https://github.com/marprzybysz" target="_blank" rel="noreferrer">
                  {t.aboutAuthorName}
                </a>
              </p>
              <p>
                <strong>{t.aboutFrontendLabel}</strong> {t.aboutFrontendValue}
              </p>
              <p>
                <strong>{t.aboutBackendLabel}</strong> {t.aboutBackendValue}
              </p>
              <p>
                <strong>{t.aboutDatabaseLabel}</strong> {t.aboutDatabaseValue}
              </p>
              <p>
                <strong>{t.aboutScrapingLabel}</strong> {t.aboutScrapingValue}
              </p>
              <p>
                <strong>{t.aboutToolsLabel}</strong> {t.aboutToolsValue}
              </p>
              <p>
                <strong>{t.aboutEditorLabel}</strong> {t.aboutEditorValue}
              </p>
              <div className="about-thanks">
                <p>
                  <strong>{t.thanksLabel}</strong>
                </p>
                <p>
                  <a href="https://www.youtube.com/@PawelCyrklafDevOps" target="_blank" rel="noreferrer">
                    Pawel Cyrklaf
                  </a>{" "}
                  - {t.thanksPawel}
                </p>
                <p>
                  <a href="https://www.linkedin.com/in/adam-kozłowski-ten-od-api/" target="_blank" rel="noreferrer">
                    Adam Kozlowski
                  </a>{" "}
                  - {t.thanksAdam}
                </p>
              </div>
              <button
                type="button"
                className="ghost-btn about-roadmap-btn"
                onClick={() => setShowRoadmap((prev) => !prev)}
              >
                {t.roadmap} {showRoadmap ? "▴" : "▾"}
              </button>
              {showRoadmap ? (
                <div className="about-roadmap-panel">
                  <p>{t.roadmapLine}</p>
                  <small>{t.roadmapNote}</small>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <footer className="app-footer">
        Powered by{" "}
        <a href="https://github.com/marprzybysz" target="_blank" rel="noreferrer">
          Marcin Przybysz
        </a>
      </footer>
    </main>
  );
}
