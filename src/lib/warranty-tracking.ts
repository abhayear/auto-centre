import {
  canSetWarrantyTrackingMode,
  type WarrantyRole,
} from "@/lib/warranty-roles";

export const WARRANTY_TRACKING_MODES = ["serial", "batch", "both"] as const;
export type WarrantyTrackingMode = (typeof WARRANTY_TRACKING_MODES)[number];

/** Existing claims keep today's serial behaviour until intake chooses otherwise. */
export const DEFAULT_WARRANTY_TRACKING_MODE: WarrantyTrackingMode = "serial";

export const WARRANTY_TRACKING_MODE_LABELS: Record<WarrantyTrackingMode, string> = {
  serial: "Serial number",
  batch: "Batch number",
  both: "Serial and batch",
};

/**
 * How the part left the shop is how we follow it. Receiving does not invent
 * a missing identifier.
 */
export const WARRANTY_SENT_BY_LABELS: Record<WarrantyTrackingMode, string> = {
  serial: "Sent by serial — track this serial",
  batch: "Sent by batch — track this batch",
  both: "Sent by serial and batch — track both",
};

export const WARRANTY_IDENTIFIER_LABEL = "Serial or batch number";

export const WARRANTY_TRACKING_MODE_OPTIONS = WARRANTY_TRACKING_MODES.map((value) => ({
  value,
  label: WARRANTY_TRACKING_MODE_LABELS[value],
}));

/** Prefixes we issue for lots that are not unique physical objects. */
export const COMPONENT_BATCH_PREFIXES = ["BAT-LOT", "LOT", "BATCH"] as const;

const INTAKE_STATUSES = new Set(["received_from_customer"]);

export type WarrantyTrackingFields = {
  trackingMode?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
};

export function isWarrantyTrackingMode(value: string): value is WarrantyTrackingMode {
  return (WARRANTY_TRACKING_MODES as readonly string[]).includes(value);
}

export function initialWarrantyTrackingMode(
  claimMode?: string | null,
): WarrantyTrackingMode {
  if (claimMode) return normalizeWarrantyTrackingMode(claimMode);
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("tracking");
    return normalizeWarrantyTrackingMode(param);
  }
  return DEFAULT_WARRANTY_TRACKING_MODE;
}

export function normalizeWarrantyTrackingMode(
  value?: string | null,
): WarrantyTrackingMode {
  if (value && isWarrantyTrackingMode(value)) return value;
  return DEFAULT_WARRANTY_TRACKING_MODE;
}

export function trimWarrantyIdentifier(value?: string | null): string {
  return (value ?? "").trim();
}

export function usesWarrantyBatch(mode?: string | null): boolean {
  const value = normalizeWarrantyTrackingMode(mode);
  return value === "batch" || value === "both";
}

export function usesWarrantySerial(mode?: string | null): boolean {
  const value = normalizeWarrantyTrackingMode(mode);
  return value === "serial" || value === "both";
}

export function hasWarrantyTrackingIdentifier(input: WarrantyTrackingFields): boolean {
  const serial = trimWarrantyIdentifier(input.serialNumber);
  const batch = trimWarrantyIdentifier(input.batchNumber);
  const mode = normalizeWarrantyTrackingMode(input.trackingMode);
  if (mode === "both") return Boolean(serial && batch);
  if (mode === "batch") return Boolean(batch || serial);
  return Boolean(serial);
}

/**
 * The challan identifier. Batch-only stays on the batch. Serial-only stays on
 * the serial. Both keeps both, so search and follow-up can use either.
 */
export function warrantySentTrackingKey(input: WarrantyTrackingFields): {
  mode: WarrantyTrackingMode;
  identifier: string | null;
} {
  const mode = normalizeWarrantyTrackingMode(input.trackingMode);
  const serial = trimWarrantyIdentifier(input.serialNumber);
  const batch = trimWarrantyIdentifier(input.batchNumber);
  if (mode === "both") {
    const parts = [batch, serial].filter(Boolean);
    return { mode, identifier: parts.length ? parts.join(" / ") : null };
  }
  if (mode === "batch") {
    return { mode, identifier: batch || null };
  }
  return { mode, identifier: serial || null };
}

export function warrantySentByLabel(mode?: string | null): string {
  return WARRANTY_SENT_BY_LABELS[normalizeWarrantyTrackingMode(mode)];
}

export function isWarrantyClaimPastIntake(status: string): boolean {
  return !INTAKE_STATUSES.has(status);
}

/**
 * Intake and manager choose how the part is sent. After dispatch only the
 * manager / owner may correct that choice, and only with a reason.
 */
export function canChangeWarrantyTrackingMode(
  role: WarrantyRole,
  status: string,
): { allowed: boolean; requiresReason: boolean } {
  if (!canSetWarrantyTrackingMode(role)) {
    return { allowed: false, requiresReason: false };
  }
  if (!isWarrantyClaimPastIntake(status)) {
    return { allowed: true, requiresReason: false };
  }
  if (role === "intake") {
    return { allowed: false, requiresReason: false };
  }
  return { allowed: true, requiresReason: true };
}
