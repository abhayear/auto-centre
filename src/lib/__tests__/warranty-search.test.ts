import { describe, expect, it } from "vitest";
import { classifyWarrantySearch } from "@/lib/warranty-search";

describe("classifyWarrantySearch", () => {
  it("recognises a warranty case number", () => {
    expect(classifyWarrantySearch("WC-2026-00125")).toEqual({
      kind: "case",
      value: "WC-2026-00125",
      normalized: "WC-2026-00125",
    });
    expect(classifyWarrantySearch("wc-0001")?.kind).toBe("case");
  });

  it("recognises a phone number however it is typed", () => {
    expect(classifyWarrantySearch("9876543210")).toEqual({
      kind: "phone",
      value: "9876543210",
      normalized: "9876543210",
    });
    expect(classifyWarrantySearch("+91 98765 43210")?.normalized).toBe("9876543210");
    expect(classifyWarrantySearch("098765-43210")?.kind).toBe("phone");
  });

  it("recognises a component serial", () => {
    expect(classifyWarrantySearch("BAT-45821")?.kind).toBe("serial");
    expect(classifyWarrantySearch("chg-77341")?.normalized).toBe("CHG-77341");
    expect(classifyWarrantySearch("MTR5521")?.kind).toBe("serial");
    expect(classifyWarrantySearch("XYZ-9001")?.kind).toBe("serial");
  });

  it("recognises a bike number", () => {
    expect(classifyWarrantySearch("EB1025")).toEqual({
      kind: "bike",
      value: "EB1025",
      normalized: "EB1025",
    });
    expect(classifyWarrantySearch("eb 1025")?.normalized).toBe("EB1025");
  });

  it("falls back to a customer name", () => {
    expect(classifyWarrantySearch("Rajesh Kumar")).toEqual({
      kind: "name",
      value: "Rajesh Kumar",
      normalized: "RAJESH KUMAR",
    });
  });

  it("ignores an empty box", () => {
    expect(classifyWarrantySearch("")).toBeNull();
    expect(classifyWarrantySearch("   ")).toBeNull();
  });
});
