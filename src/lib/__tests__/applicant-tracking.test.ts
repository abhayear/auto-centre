import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  formatStatusLabel,
  generateTrackingCode,
  isApplicationStatus,
  statusChangeMessage,
} from "../applicant-tracking";

describe("generateTrackingCode", () => {
  it("returns AG- prefix with 6 characters", () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^AG-[A-Z2-9]{6}$/);
  });

  it("generates unique codes across multiple calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateTrackingCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("isApplicationStatus", () => {
  it("accepts valid statuses", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(isApplicationStatus(status)).toBe(true);
    }
  });

  it("rejects invalid statuses", () => {
    expect(isApplicationStatus("pending")).toBe(false);
    expect(isApplicationStatus("")).toBe(false);
  });
});

describe("formatStatusLabel", () => {
  it("returns label for known status", () => {
    expect(formatStatusLabel("new")).toBe(APPLICATION_STATUS_LABELS.new);
    expect(formatStatusLabel("hired")).toBe("Offer accepted");
  });

  it("returns raw value for unknown status", () => {
    expect(formatStatusLabel("unknown")).toBe("unknown");
  });
});

describe("statusChangeMessage", () => {
  it("describes transition between statuses", () => {
    expect(statusChangeMessage("new", "reviewing")).toBe(
      "Status updated from Application received to Under review",
    );
  });
});
