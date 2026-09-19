import { describe, expect, it } from "vitest";
import {
  DEFAULT_WARRANTY_TRACKING_MODE,
  WARRANTY_IDENTIFIER_LABEL,
  WARRANTY_SENT_BY_LABELS,
  WARRANTY_TRACKING_MODES,
  canChangeWarrantyTrackingMode,
  hasWarrantyTrackingIdentifier,
  isWarrantyClaimPastIntake,
  normalizeWarrantyTrackingMode,
  warrantySentTrackingKey,
} from "@/lib/warranty-tracking";

describe("warranty tracking mode", () => {
  it("defaults existing claims to serial so current behaviour stays", () => {
    expect(DEFAULT_WARRANTY_TRACKING_MODE).toBe("serial");
    expect(WARRANTY_TRACKING_MODES).toEqual(["serial", "batch", "both"]);
    expect(normalizeWarrantyTrackingMode(null)).toBe("serial");
    expect(normalizeWarrantyTrackingMode("batch")).toBe("batch");
    expect(normalizeWarrantyTrackingMode("both")).toBe("both");
    expect(WARRANTY_IDENTIFIER_LABEL.toLowerCase()).toContain("serial or batch");
  });

  it("treats a batch number as a valid identifier and a missing pair as invalid", () => {
    expect(
      hasWarrantyTrackingIdentifier({
        trackingMode: "batch",
        serialNumber: null,
        batchNumber: "BAT-LOT-2026-08",
      }),
    ).toBe(true);
    expect(
      hasWarrantyTrackingIdentifier({
        trackingMode: "batch",
        serialNumber: "  ",
        batchNumber: "",
      }),
    ).toBe(false);
    expect(
      hasWarrantyTrackingIdentifier({
        trackingMode: "serial",
        serialNumber: "BAT-8821",
        batchNumber: null,
      }),
    ).toBe(true);
    expect(
      hasWarrantyTrackingIdentifier({
        trackingMode: "both",
        serialNumber: "BAT-8821",
        batchNumber: "BAT-LOT-2026-08",
      }),
    ).toBe(true);
    expect(
      hasWarrantyTrackingIdentifier({
        trackingMode: "both",
        serialNumber: "BAT-8821",
        batchNumber: "",
      }),
    ).toBe(false);
  });

  it("locks the mode after dispatch unless a manager or owner gives a reason", () => {
    expect(isWarrantyClaimPastIntake("received_from_customer")).toBe(false);
    expect(isWarrantyClaimPastIntake("sent_to_company")).toBe(true);

    expect(canChangeWarrantyTrackingMode("intake", "received_from_customer")).toEqual({
      allowed: true,
      requiresReason: false,
    });
    expect(canChangeWarrantyTrackingMode("intake", "sent_to_company")).toEqual({
      allowed: false,
      requiresReason: false,
    });
    expect(canChangeWarrantyTrackingMode("warranty_manager", "sent_to_company")).toEqual({
      allowed: true,
      requiresReason: true,
    });
    expect(canChangeWarrantyTrackingMode("owner", "received_from_company")).toEqual({
      allowed: true,
      requiresReason: true,
    });
    expect(canChangeWarrantyTrackingMode("dispatch", "received_from_customer")).toEqual({
      allowed: false,
      requiresReason: false,
    });
    expect(canChangeWarrantyTrackingMode("technician", "sent_to_company")).toEqual({
      allowed: false,
      requiresReason: false,
    });
  });

  it("tracks the identifier the item was sent by, and never swaps it for the other one", () => {
    expect(WARRANTY_SENT_BY_LABELS.serial).toBe("Sent by serial — track this serial");
    expect(WARRANTY_SENT_BY_LABELS.batch).toBe("Sent by batch — track this batch");
    expect(WARRANTY_SENT_BY_LABELS.both).toBe("Sent by serial and batch — track both");

    expect(
      warrantySentTrackingKey({
        trackingMode: "serial",
        serialNumber: "BAT-8821",
        batchNumber: "BAT-LOT-2026-08",
      }),
    ).toEqual({ mode: "serial", identifier: "BAT-8821" });

    expect(
      warrantySentTrackingKey({
        trackingMode: "batch",
        serialNumber: "BAT-99172",
        batchNumber: "BAT-LOT-2026-08",
      }),
    ).toEqual({ mode: "batch", identifier: "BAT-LOT-2026-08" });

    expect(
      warrantySentTrackingKey({
        trackingMode: "both",
        serialNumber: "BAT-8821",
        batchNumber: "BAT-LOT-2026-08",
      }),
    ).toEqual({ mode: "both", identifier: "BAT-LOT-2026-08 / BAT-8821" });
  });
});
