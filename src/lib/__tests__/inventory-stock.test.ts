import { describe, expect, it } from "vitest";
import {
  applyStockMovement,
  purchaseRateSnapshot,
  rejectRateFieldsIfLocked,
  STOCK_MOVEMENT_KIND_LABELS,
} from "@/lib/inventory-stock";

describe("applyStockMovement", () => {
  it("increases on receive", () => {
    expect(applyStockMovement(2, "receive", 3)).toEqual({ qtyDelta: 3, qtyAfter: 5 });
  });

  it("decreases on issue, job_use, and spare_sale and allows negative", () => {
    expect(applyStockMovement(1, "issue", 2)).toEqual({ qtyDelta: -2, qtyAfter: -1 });
    expect(applyStockMovement(4, "job_use", 1).qtyAfter).toBe(3);
    expect(applyStockMovement(4, "spare_sale", 1).qtyAfter).toBe(3);
  });

  it("sets on-hand to physical qty on count", () => {
    expect(applyStockMovement(10, "count", 7)).toEqual({ qtyDelta: -3, qtyAfter: 7 });
  });

  it("rejects non-positive qty for non-count movements", () => {
    expect(() => applyStockMovement(1, "receive", 0)).toThrow("qty must be a positive integer");
  });
});

describe("purchaseRateSnapshot", () => {
  it("prefers catalog rate when present", () => {
    expect(purchaseRateSnapshot({ catalogRate: 12.5, partPurchaseRate: 10 })).toBe(12.5);
    expect(purchaseRateSnapshot({ catalogRate: null, partPurchaseRate: 10 })).toBe(10);
  });
});

describe("rejectRateFieldsIfLocked", () => {
  it("blocks purchasing and store from sending rate fields", () => {
    expect(rejectRateFieldsIfLocked("purchasing", { purchaseRate: 1 })).toBeTruthy();
    expect(rejectRateFieldsIfLocked("store", { sellingPrice: 2 })).toBeTruthy();
    expect(rejectRateFieldsIfLocked("purchasing", { qty: 1 })).toBeNull();
    expect(rejectRateFieldsIfLocked("manager", { sellingPrice: 9 })).toBeNull();
  });
});

describe("STOCK_MOVEMENT_KIND_LABELS", () => {
  it("labels every movement kind", () => {
    expect(STOCK_MOVEMENT_KIND_LABELS.receive).toBe("Receive");
    expect(STOCK_MOVEMENT_KIND_LABELS.issue).toBe("Issue");
    expect(STOCK_MOVEMENT_KIND_LABELS.job_use).toBe("Job use");
    expect(STOCK_MOVEMENT_KIND_LABELS.spare_sale).toBe("Spare sale");
    expect(STOCK_MOVEMENT_KIND_LABELS.count).toBe("Count");
  });
});
