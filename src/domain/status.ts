export type CanonicalStatus =
  | "Zapisano"
  | "Wyslano"
  | "Odczytano"
  | "W trakcie"
  | "Rozmowa"
  | "Oferta"
  | "Odrzucono"
  | "Odmowa";

export const STATUS_OPTIONS: CanonicalStatus[] = [
  "Wyslano",
  "Zapisano",
  "Odczytano",
  "W trakcie",
  "Rozmowa",
  "Oferta",
  "Odrzucono",
  "Odmowa",
];

export function normalizeStatusKey(status: string | null | undefined): string {
  return String(status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeOfferStatus(status: string | null | undefined, appliedDefault = true): CanonicalStatus {
  const normalized = normalizeStatusKey(status);
  if (!normalized) return appliedDefault ? "Wyslano" : "Zapisano";

  if (["applied", "wyslano", "wysłano", "sent", "zaaplikowano"].includes(normalized)) return "Wyslano";
  if (["saved", "zapisano", "draft"].includes(normalized)) return "Zapisano";
  if (["odczytano", "odczytana", "read"].includes(normalized)) return "Odczytano";
  if (["interview", "in progress", "w trakcie", "proces"].includes(normalized)) return "W trakcie";
  if (["rozmowa", "rozmowa umowiona", "umowienie na rozmowe", "umówienie na rozmowę"].includes(normalized)) return "Rozmowa";
  if (["offer", "oferta"].includes(normalized)) return "Oferta";
  if (normalized.includes("odrzu") || normalized.includes("rejected")) return "Odrzucono";
  if (normalized.includes("odmow")) return "Odmowa";

  return appliedDefault ? "Wyslano" : "Zapisano";
}

export function inferAppliedFromStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatusKey(status);
  return normalized !== "zapisano" && normalized !== "saved";
}

export function normalizeStatusForChart(statusName: string): string {
  const normalized = normalizeStatusKey(statusName);
  if (normalized.includes("odrzu") || normalized.includes("odmow") || normalized.includes("rejected")) {
    return "Odrzucono/Odmowa";
  }
  return statusName;
}
