import { describe, expect, it } from "vitest";
import { cn, formatDate, formatPrice, parseImages } from "../utils";

describe("formatPrice", () => {
  it("formats USD without decimals", () => {
    expect(formatPrice(45900)).toBe("$45,900");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0");
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

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", false && "c", undefined, "d")).toBe("a b d");
  });

  it("returns empty string when no classes", () => {
    expect(cn()).toBe("");
  });
});
