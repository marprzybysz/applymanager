import type { StatsWidgetKey, SummaryMetricKey } from "../types/app";

export const DEFAULT_SUMMARY_METRICS: SummaryMetricKey[] = [
  "totalOffers",
  "appliedOffers",
  "activeOffers",
  "expiredOffers",
  "avgDaysLeft",
  "recentApplications",
];

export const STATS_LAYOUT_SLOT_COUNT = 28;
export const SUMMARY_DND_SLOT_MIME = "application/x-applymanager-summary-slot";
export const SUMMARY_DND_METRIC_MIME = "application/x-applymanager-summary-metric";

export const DEFAULT_STATS_LAYOUT_WIDGETS: StatsWidgetKey[] = [
  "totalOffers",
  "appliedOffers",
  "activeOffers",
  "expiredOffers",
  "avgDaysLeft",
  "recentApplications",
  "statusTypes",
  "offersWithLink",
  "chartTrend",
  "chartInvitesRead",
  "chartStatus",
  "chartSource",
];

export const CONTRACT_TYPES = [
  "dowolny",
  "umowa o pracę",
  "umowa b2b",
  "umowa zlecenie",
  "umowa o dzieło",
  "umowa agencyjna",
  "samozatrudnienie",
];
export const WORK_TIMES = ["dowolny", "pełny etat", "pół etatu"];
export const WORK_MODES = ["dowolny", "stacjonarna", "hybrydowa", "zdalna"];
export const SHIFT_COUNTS = ["dowolny", "jedna zmiana", "dwie zmiany", "trzy zmiany"];
export const WORKING_HOURS_OPTIONS = ["dowolny", "6-14", "14-22", "22-6"];
export const ARCHIVED_FILTER_VALUE = "__archived__";
export const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#84cc16"];

export const NOTIFICATION_CLOSE_ANIMATION_MS = 180;
export const ROW_EXIT_ANIMATION_MS = 320;
export const VIRTUALIZATION_THRESHOLD = 120;
export const VIRTUALIZATION_OVERSCAN = 10;
export const ROW_HEIGHT_COMPACT = 46;
export const ROW_HEIGHT_FULL = 52;
