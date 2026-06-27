import { describe, expect, it } from "vitest";
import { cn, formatDate, formatEmploymentType, formatPrice, parseImages } from "../utils";

describe("formatPrice", () => {
  it("formats INR without decimals", () => {
    expect(formatPrice(45900)).toMatch(/45,900/);
    expect(formatPrice(45900)).toMatch(/₹|INR/);
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toMatch(/0/);
  });
});

describe("formatDate", () => {
  it("formats ISO date strings", () => {
    const formatted = formatDate("2026-06-18");
    expect(formatted).toMatch(/Jun/);
    expect(formatted).toMatch(/18/);
    expect(formatted).toMatch(/2026/);
  });
});

describe("parseImages", () => {
  it("parses JSON array of URLs", () => {
    const urls = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
    expect(parseImages(JSON.stringify(urls))).toEqual(urls);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseImages("not-json")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseImages('{"url":"https://example.com/a.jpg"}')).toEqual([]);
  });
});

describe("formatEmploymentType", () => {
  it("formats employment types", () => {
    expect(formatEmploymentType("full_time")).toBe("Full-time");
    expect(formatEmploymentType("part_time")).toBe("Part-time");
    expect(formatEmploymentType("contract")).toBe("Contract");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", false && "c", undefined, "d")).toBe("a b d");
  });

  it("returns empty string when no classes", () => {
    expect(cn()).toBe("");
  });
});
