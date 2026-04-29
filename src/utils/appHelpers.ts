import { CHART_COLORS, DEFAULT_STATS_LAYOUT_WIDGETS, STATS_LAYOUT_SLOT_COUNT } from "../constants/app";
import { inferAppliedFromStatus, normalizeOfferStatus } from "../domain/status";
import type {
  NotificationSettings,
  NotificationTone,
  Offer,
  OfferStats,
  StatsWidgetKey,
  StatusTone,
  UserPreferences,
} from "../types/app";

export function createDefaultStatsLayoutSlots(): Array<StatsWidgetKey | null> {
  const slots: Array<StatsWidgetKey | null> = Array.from({ length: STATS_LAYOUT_SLOT_COUNT }, () => null);
  DEFAULT_STATS_LAYOUT_WIDGETS.forEach((key, index) => {
    if (index < slots.length) slots[index] = key;
  });
  return slots;
}

const CHART_WIDGET_KEY_PREFIXES = "chart";

export function normalizeStatsLayoutSlotsForCharts(slots: Array<StatsWidgetKey | null>): Array<StatsWidgetKey | null> {
  const isChart = (k: StatsWidgetKey | null): k is StatsWidgetKey => k !== null && k.startsWith(CHART_WIDGET_KEY_PREFIXES);
  const kpis = slots.filter((k): k is StatsWidgetKey => k !== null && !isChart(k));
  const charts = slots.filter(isChart);
  const result: Array<StatsWidgetKey | null> = Array.from({ length: slots.length }, () => null);

  let kpiIdx = 0;
  for (let i = 0; i < result.length && kpiIdx < kpis.length; i++) {
    if (result[i] === null) result[i] = kpis[kpiIdx++];
  }

  let chartIdx = 0;
  for (let i = 0; i < result.length && chartIdx < charts.length; i++) {
    if (result[i] !== null) continue;
    if (Math.floor(i / 4) >= 5) break;
    const coveredByAbove = [1, 2].some((rowsAbove) => {
      const above = i - 4 * rowsAbove;
      return above >= 0 && isChart(result[above]);
    });
    if (coveredByAbove) continue;
    result[i] = charts[chartIdx++];
  }

  return result;
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeForDuplicate(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeUrlForDuplicate(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "").toLowerCase();
}

export function normalizeDateForDuplicate(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 10);
}

export function createDefaultOffer(): Offer {
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

export function normalizeImportEntryToOffer(entry: Partial<Offer>): Offer {
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

export function createDefaultPreferences(): UserPreferences {
  return {
    preferredContractTypes: [],
    preferredWorkTimes: [],
    preferredWorkModes: [],
    preferredShiftCounts: [],
    preferredWorkingHours: "",
  };
}

export function createDefaultStats(): OfferStats {
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

export function parseWorkingHoursSelection(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function serializeWorkingHoursSelection(values: string[]): string {
  return values.join(", ");
}

export function normalizeDateForInput(value: string | null | undefined): string {
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

export function normalizeOfferForEdit(offer: Offer): Offer {
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

export function getPrimaryLocation(location: string | null | undefined): string {
  const text = String(location || "").trim();
  if (!text) return "-";
  return text.split(",")[0]?.trim() || text;
}

export function getNotificationAutoHideMs(tone: NotificationTone): number | null {
  if (tone === "success") return 5000;
  if (tone === "warning") return 30000;
  if (tone === "error") return null;
  return 10000;
}

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    enableToasts: true,
    enableBellHistory: true,
    allowSuccess: true,
    allowWarning: true,
    allowError: true,
    allowNeutral: true,
  };
}

export function getExpiryTone(daysToExpire: number | null | undefined): StatusTone | "expired" {
  if (daysToExpire === null || daysToExpire === undefined) return "neutral";
  if (daysToExpire < 0) return "expired";
  if (daysToExpire >= 21) return "green";
  if (daysToExpire >= 10) return "yellow";
  return "red";
}

export function formatDaysToExpire(daysToExpire: number | null | undefined, labels: { expired: string; singular: string; plural: string }): string {
  if (daysToExpire === null || daysToExpire === undefined) return "-";
  if (daysToExpire < 0) return labels.expired;
  if (daysToExpire === 0) return `0 ${labels.plural}`;
  if (daysToExpire === 1) return `1 ${labels.singular}`;
  return `${daysToExpire} ${labels.plural}`;
}

export function formatChartDateLabel(dateIso: string): string {
  const parsed = Date.parse(dateIso);
  if (Number.isNaN(parsed)) return dateIso;
  const date = new Date(parsed);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}.${month}`;
}

export function getStatusBarColor(statusName: string, index: number): string {
  if (statusName === "Odrzucono/Odmowa") {
    return "#ef4444";
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}
