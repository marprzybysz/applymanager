import type { CanonicalStatus } from "../domain/status";

export type Offer = {
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

export type ScrapedJob = {
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

export type ExcelImportIssue = {
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

export type ExportAssistantRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  missingFields: string[];
  draft: Offer;
  saved: boolean;
};

export type ImportPreviewMeta = {
  filename?: string;
  size?: number;
  sha256?: string;
};

export type UserPreferences = {
  preferredContractTypes: string[];
  preferredWorkTimes: string[];
  preferredWorkModes: string[];
  preferredShiftCounts: string[];
  preferredWorkingHours: string;
};

export type OfferStats = {
  totalOffers: number;
  appliedOffers: number;
  activeOffers: number;
  expiredOffers: number;
  averageDaysLeft: number | null;
  recentApplications7d: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
};

export type SummaryMetricKey =
  | "totalOffers"
  | "appliedOffers"
  | "activeOffers"
  | "activeShare"
  | "expiredOffers"
  | "avgDaysLeft"
  | "recentApplications"
  | "applicationsToday"
  | "archivedOffers"
  | "readOffers"
  | "invitationOffers"
  | "rejectedOffers"
  | "sourceTypes"
  | "statusTypes"
  | "offersWithLink";

export type StatsChartWidgetKey =
  | "chartTrend"
  | "chartInvitesRead"
  | "chartStatus"
  | "chartSource"
  | "chartCumulativeOffers"
  | "chartStatusTrend";
export type StatsWidgetKey = SummaryMetricKey | StatsChartWidgetKey;
export type StatsWidgetOption = { key: StatsWidgetKey; label: string; value: string; kind: "summary" | "chart"; size: "1x1" | "1x2" };
export type StatsLayoutDragState =
  | { source: "slot"; index: number; widgetKey: StatsWidgetKey }
  | { source: "library"; widgetKey: StatsWidgetKey }
  | null;

export type ThemeMode = "auto" | "light" | "dark";
export type SettingsTab = "general" | "notifications" | "preferences" | "about";
export type AddOfferMode = "link" | "manual";
export type ImportTarget = "offers" | "preferences";
export type ImportFormat = "xlsx" | "json";
export type ExportTarget = "offers" | "preferences" | "all";
export type ExportFormat = "xlsx" | "json";
export type TopTab = "offers" | "stats";
export type PeriodFilter = "all" | "month" | "quarter" | "year";
export type SortDirection = "none" | "asc" | "desc";
export type SortType = "text" | "date" | "number";
export type SortColumn =
  | "role"
  | "company"
  | "status"
  | "location"
  | "appliedAt"
  | "datePosted"
  | "expiresAt"
  | "daysToExpire"
  | "source";
export type StatusTone = "blue" | "yellow" | "green" | "red" | "neutral" | "pink";
export type NotificationTone = "success" | "error" | "warning" | "neutral";
export type NotificationSettings = {
  enableToasts: boolean;
  enableBellHistory: boolean;
  allowSuccess: boolean;
  allowWarning: boolean;
  allowError: boolean;
  allowNeutral: boolean;
};
export type RowExitAnimationKind = "archive" | "delete";
export type AppNotification = {
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

export type { CanonicalStatus };
