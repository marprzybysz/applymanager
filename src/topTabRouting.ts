export type TopTabRoute = "offers" | "stats";

const TOP_TAB_PATHS: Record<TopTabRoute, string> = {
  offers: "/offers",
  stats: "/charts",
};

const STATS_PATH_ALIASES = new Set(["/charts", "/stats"]);

function normalizePathname(pathname: string): string {
  const normalized = pathname.trim().toLowerCase();
  if (!normalized) return "/";
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

export function resolveTopTabFromPathname(pathname: string): TopTabRoute | null {
  const normalized = normalizePathname(pathname);
  if (normalized === TOP_TAB_PATHS.offers) return "offers";
  if (STATS_PATH_ALIASES.has(normalized)) return "stats";
  return null;
}

export function buildPathnameForTopTab(tab: TopTabRoute): string {
  return TOP_TAB_PATHS[tab];
}

