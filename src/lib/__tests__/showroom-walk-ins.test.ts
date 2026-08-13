import { describe, expect, it } from "vitest";
import {
  formatShowroomDate,
  formatShowroomPaymentMode,
  parseShowroomDateInput,
  SHOWROOM_PAYMENT_MODE_OPTIONS,
} from "@/lib/showroom-walk-ins";
import { showroomWalkInSchema } from "@/lib/validators";

describe("showroom-walk-ins validators", () => {
  it("accepts a valid walk-in enquiry", () => {
    const result = showroomWalkInSchema.safeParse({
      enquiryDate: "2026-08-13",
      name: "Rajesh Kumar",
      requiredModel: "Yakuza Rubie",
      contactNumber: "9876543210",
      address: "Civil Line, Lalitpur",
      paymentMode: "cash",
      expectedPurchaseDate: "2026-08-20",
    });

    expect(result.success).toBe(true);
  });

  it("requires name and required model", () => {
    const result = showroomWalkInSchema.safeParse({
      enquiryDate: "2026-08-13",
      name: "A",
      requiredModel: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid enquiry date format", () => {
    const result = showroomWalkInSchema.safeParse({
      enquiryDate: "13-08-2026",
      name: "Rajesh Kumar",
      requiredModel: "Yakuza Rubie",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid payment mode", () => {
    const result = showroomWalkInSchema.safeParse({
      enquiryDate: "2026-08-13",
      name: "Rajesh Kumar",
      requiredModel: "Yakuza Rubie",
      paymentMode: "cheque",
    });

    expect(result.success).toBe(false);
  });

  it("allows optional contact fields", () => {
    const result = showroomWalkInSchema.safeParse({
      enquiryDate: "2026-08-13",
      name: "Rajesh Kumar",
      requiredModel: "Yakuza Rubie",
    });

    expect(result.success).toBe(true);
  });
});

describe("showroom-walk-ins helpers", () => {
  it("parses date-only input as UTC midnight", () => {
    const date = parseShowroomDateInput("2026-08-13");
    expect(date.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });

  it("formats payment mode labels", () => {
    expect(formatShowroomPaymentMode("finance_bajaj")).toBe("Finance by Bajaj");
    expect(formatShowroomPaymentMode(null)).toBe("—");
  });

  it("formats showroom dates", () => {
    expect(formatShowroomDate("2026-08-13")).toMatch(/13/);
  });

  it("exposes all payment mode options", () => {
    expect(SHOWROOM_PAYMENT_MODE_OPTIONS).toHaveLength(4);
    expect(SHOWROOM_PAYMENT_MODE_OPTIONS.map((option) => option.label)).toContain("Online");
  });
});
