import { WARRANTY_CASE_PREFIX } from "@/lib/warranty-allocation";

export const WARRANTY_SEARCH_KINDS = ["case", "phone", "serial", "bike", "name"] as const;
export type WarrantySearchKind = (typeof WARRANTY_SEARCH_KINDS)[number];

export const WARRANTY_SEARCH_KIND_LABELS: Record<WarrantySearchKind, string> = {
  case: "Warranty claim",
  phone: "Customer phone",
  serial: "Component serial",
  bike: "Bike number",
  name: "Customer name",
};

/** Serial prefixes we issue today; the dash rule catches anything else. */
export const COMPONENT_SERIAL_PREFIXES = ["BAT", "CHG", "MTR", "CTR", "CON"] as const;

export type WarrantySearch = {
  kind: WarrantySearchKind;
  /** What the dealer typed, trimmed. */
  value: string;
  /** What to match on: last 10 digits for a phone, upper case otherwise. */
  normalized: string;
};

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

function looksLikePhone(value: string): boolean {
  if (!/^[\d\s+()-]+$/.test(value)) return false;
  const digits = digitsOf(value);
  return digits.length >= 10 && digits.length <= 12;
}

function looksLikeSerial(value: string): boolean {
  if (COMPONENT_SERIAL_PREFIXES.some((prefix) => value.startsWith(prefix))) return true;
  return value.includes("-") && /[A-Z]/.test(value) && /\d/.test(value);
}

function looksLikeBike(value: string): boolean {
  return /^[A-Z]{1,4}[-\s]?\d{2,}$/.test(value);
}

/**
 * One search box for everything a dealer remembers: a phone number, a serial,
 * a bike number, or a case number.
 */
export function classifyWarrantySearch(raw: string): WarrantySearch | null {
  const value = raw.trim();
  if (!value) return null;

  const upper = value.toUpperCase();

  if (upper.startsWith(WARRANTY_CASE_PREFIX)) {
    return { kind: "case", value, normalized: upper };
  }

  if (looksLikePhone(value)) {
    return { kind: "phone", value, normalized: digitsOf(value).slice(-10) };
  }

  if (looksLikeSerial(upper)) {
    return { kind: "serial", value, normalized: upper };
  }

  if (looksLikeBike(upper)) {
    return { kind: "bike", value, normalized: upper.replace(/[-\s]/g, "") };
  }

  return { kind: "name", value, normalized: upper };
}
