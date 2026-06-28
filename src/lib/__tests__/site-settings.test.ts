import { describe, expect, it } from "vitest";
import { BUSINESS_HOURS } from "@/lib/constants";
import {
  getActiveNotice,
  parseBusinessHours,
  serializeBusinessHours,
} from "@/lib/site-settings";

describe("parseBusinessHours", () => {
  it("parses valid JSON hours", () => {
    const raw = serializeBusinessHours([
      { day: "Mon–Sat", hours: "9 AM – 7 PM" },
      { day: "Sunday", hours: "Closed" },
    ]);
    expect(parseBusinessHours(raw)).toEqual([
      { day: "Mon–Sat", hours: "9 AM – 7 PM" },
      { day: "Sunday", hours: "Closed" },
    ]);
  });

  it("falls back to defaults for invalid JSON", () => {
    expect(parseBusinessHours("not-json")).toEqual(BUSINESS_HOURS);
  });

  it("falls back when array is empty", () => {
    expect(parseBusinessHours("[]")).toEqual(BUSINESS_HOURS);
  });
});

describe("getActiveNotice", () => {
  it("returns notice text when active", () => {
    expect(
      getActiveNotice({
        businessHours: BUSINESS_HOURS,
        noticeText: "Closed tomorrow",
        noticeActive: true,
      })
    ).toBe("Closed tomorrow");
  });

  it("returns null when inactive or empty", () => {
    expect(
      getActiveNotice({
        businessHours: BUSINESS_HOURS,
        noticeText: "Closed tomorrow",
        noticeActive: false,
      })
    ).toBeNull();

    expect(
      getActiveNotice({
        businessHours: BUSINESS_HOURS,
        noticeText: "   ",
        noticeActive: true,
      })
    ).toBeNull();
  });
});
