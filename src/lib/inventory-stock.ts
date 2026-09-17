import { canWriteInventoryRates } from "@/lib/inventory-access";
import type { StaffRole } from "@/lib/admin-roles";

export const STOCK_MOVEMENT_KINDS = [
  "receive",
  "issue",
  "job_use",
  "spare_sale",
  "count",
] as const;

export type StockMovementKind = (typeof STOCK_MOVEMENT_KINDS)[number];

export const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string> = {
  receive: "Receive",
  issue: "Issue",
  job_use: "Job use",
  spare_sale: "Spare sale",
  count: "Count",
};

function assertQty(kind: StockMovementKind, qty: number) {
  if (!Number.isInteger(qty) || !Number.isFinite(qty)) {
    throw new Error("qty must be a positive integer");
  }
  if (kind === "count") {
    if (qty < 0) {
      throw new Error("qty must be a positive integer");
    }
    return;
  }
  if (qty < 1) {
    throw new Error("qty must be a positive integer");
  }
}

export function applyStockMovement(
  onHandQty: number,
  kind: StockMovementKind,
  qty: number,
): { qtyDelta: number; qtyAfter: number } {
  assertQty(kind, qty);
  if (kind === "receive") {
    return { qtyDelta: qty, qtyAfter: onHandQty + qty };
  }
  if (kind === "count") {
    return { qtyDelta: qty - onHandQty, qtyAfter: qty };
  }
  return { qtyDelta: -qty, qtyAfter: onHandQty - qty };
}

export function purchaseRateSnapshot(args: {
  catalogRate: number | null;
  partPurchaseRate: number;
}): number {
  return args.catalogRate ?? args.partPurchaseRate;
}

export function rejectRateFieldsIfLocked(
  role: StaffRole,
  body: Record<string, unknown>,
): string | null {
  if (canWriteInventoryRates(role)) return null;
  if ("purchaseRate" in body || "sellingPrice" in body) {
    return "Rates cannot be changed";
  }
  return null;
}
