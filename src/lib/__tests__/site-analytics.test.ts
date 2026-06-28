import { describe, expect, it } from "vitest";
import {
  formatVisitLocation,
  normalizeVisitPath,
  parseDeviceFromUserAgent,
} from "@/lib/site-analytics";

describe("normalizeVisitPath", () => {
  it("keeps valid paths", () => {
    expect(normalizeVisitPath("/services")).toBe("/services");
  });

  it("strips query strings", () => {
    expect(normalizeVisitPath("/vehicles?sort=price")).toBe("/vehicles");
  });

  it("falls back to root for invalid paths", () => {
    expect(normalizeVisitPath("http://evil.com")).toBe("/");
  });
});

describe("parseDeviceFromUserAgent", () => {
  it("detects mobile", () => {
    expect(parseDeviceFromUserAgent("Mozilla/5.0 (iPhone) Mobile")).toBe("Mobile");
  });

  it("detects desktop", () => {
    expect(parseDeviceFromUserAgent("Mozilla/5.0 Windows NT 10.0")).toBe("Desktop");
  });
});

describe("formatVisitLocation", () => {
  it("joins city region country", () => {
    expect(
      formatVisitLocation({ city: "Lalitpur", region: "UP", country: "IN" })
    ).toBe("Lalitpur, UP, IN");
  });

  it("returns unknown when empty", () => {
    expect(formatVisitLocation({ city: null, region: null, country: null })).toBe(
      "Unknown location"
    );
  });
});
