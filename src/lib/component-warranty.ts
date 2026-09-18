import { REPLACEMENT_ITEM_TYPES, type ReplacementItemType } from "@/lib/replacement-parts";
import { addUtcMonths } from "@/lib/warranty-allocation";

export const WARRANTY_START_BASES = [
  "sale_date",
  "installation_date",
  "invoice_date",
  "company_start",
] as const;

export type WarrantyStartBasis = (typeof WARRANTY_START_BASES)[number];

export const WARRANTY_START_BASIS_LABELS: Record<WarrantyStartBasis, string> = {
  sale_date: "Sale date",
  installation_date: "Installation date",
  invoice_date: "Invoice date",
  company_start: "Company warranty start",
};

export type WarrantyPolicySettings = {
  batteryMonths: number;
  chargerMonths: number;
  motorMonths: number;
  controllerMonths: number;
  startBasis: WarrantyStartBasis;
  expiringSoonDays: number;
};

/** Company can raise or lower cover, so these are settings and not constants in code. */
export const DEFAULT_WARRANTY_POLICY: WarrantyPolicySettings = {
  batteryMonths: 36,
  chargerMonths: 12,
  motorMonths: 36,
  controllerMonths: 36,
  startBasis: "sale_date",
  expiringSoonDays: 30,
};

export const WARRANTY_STATUSES = ["active", "expiring_soon", "expired", "unknown"] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  unknown: "Not recorded",
};

export type BikeWarrantyDates = {
  saleDate?: string | null;
  installationDate?: string | null;
  invoiceDate?: string | null;
  companyStartDate?: string | null;
  warrantyStartBasis?: WarrantyStartBasis | null;
};

export type ComponentWarrantyInput = {
  componentType: string;
  warrantyStartDate?: string | null;
  warrantyMonths?: number | null;
};

export type ComponentWarrantyResult = {
  startDate: string | null;
  months: number;
  endDate: string | null;
  status: WarrantyStatus;
  daysRemaining: number | null;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeComponentType(value: string | null | undefined): ReplacementItemType {
  return REPLACEMENT_ITEM_TYPES.includes(value as ReplacementItemType)
    ? (value as ReplacementItemType)
    : "battery";
}

export function policyMonthsFor(
  componentType: string,
  policy: WarrantyPolicySettings = DEFAULT_WARRANTY_POLICY,
): number {
  switch (normalizeComponentType(componentType)) {
    case "charger":
      return policy.chargerMonths;
    case "motor":
      return policy.motorMonths;
    case "controller":
      return policy.controllerMonths;
    default:
      return policy.batteryMonths;
  }
}

/** A component may carry its own cover; otherwise the policy decides. */
export function warrantyMonthsFor(
  component: ComponentWarrantyInput,
  policy: WarrantyPolicySettings = DEFAULT_WARRANTY_POLICY,
): number {
  if (component.warrantyMonths != null && component.warrantyMonths > 0) {
    return component.warrantyMonths;
  }
  return policyMonthsFor(component.componentType, policy);
}

/** Falls back to sale then invoice date so a missing basis date never blanks the cover. */
export function warrantyStartDateFor(
  basis: WarrantyStartBasis,
  dates: BikeWarrantyDates,
): string | null {
  const chosen =
    basis === "installation_date"
      ? dates.installationDate
      : basis === "invoice_date"
        ? dates.invoiceDate
        : basis === "company_start"
          ? dates.companyStartDate
          : dates.saleDate;
  return chosen ?? dates.saleDate ?? dates.invoiceDate ?? null;
}

export function warrantyEndDate(
  startDate: string | null | undefined,
  months: number | null | undefined,
): string | null {
  if (!startDate || months == null || months <= 0) return null;
  return toDateOnly(addUtcMonths(parseDateOnly(startDate), months));
}

export function daysUntilWarrantyEnd(endDate: string, on: string): number {
  const end = parseDateOnly(endDate).getTime();
  const now = parseDateOnly(on).getTime();
  return Math.round((end - now) / 86_400_000);
}

export function warrantyStatusOn(
  endDate: string | null | undefined,
  on: string,
  expiringSoonDays: number = DEFAULT_WARRANTY_POLICY.expiringSoonDays,
): WarrantyStatus {
  if (!endDate) return "unknown";
  const days = daysUntilWarrantyEnd(endDate, on);
  if (days <= 0) return "expired";
  return days <= expiringSoonDays ? "expiring_soon" : "active";
}

/**
 * Whole answer for one component on one bike: when cover started, how long it
 * runs, when it ends, and where that leaves a complaint raised on `on`.
 */
export function componentWarranty(
  component: ComponentWarrantyInput,
  bike: BikeWarrantyDates,
  on: string,
  policy: WarrantyPolicySettings = DEFAULT_WARRANTY_POLICY,
): ComponentWarrantyResult {
  const basis = bike.warrantyStartBasis ?? policy.startBasis;
  const startDate = component.warrantyStartDate ?? warrantyStartDateFor(basis, bike);
  const months = warrantyMonthsFor(component, policy);
  const endDate = warrantyEndDate(startDate, months);

  return {
    startDate: startDate ?? null,
    months,
    endDate,
    status: warrantyStatusOn(endDate, on, policy.expiringSoonDays),
    daysRemaining: endDate ? daysUntilWarrantyEnd(endDate, on) : null,
  };
}

export function isWarrantyCovered(result: ComponentWarrantyResult): boolean {
  return result.status === "active" || result.status === "expiring_soon";
}
