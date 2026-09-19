import { describe, expect, it } from "vitest";
import { classifyWarrantySearch, findClaimsByWarrantySearch } from "@/lib/warranty-search";

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

  it("recognises a batch number the same way it recognises a serial", () => {
    expect(classifyWarrantySearch("BAT-LOT-2026-08")?.kind).toBe("batch");
    expect(classifyWarrantySearch("bat-lot-2026-08")?.normalized).toBe("BAT-LOT-2026-08");
    expect(classifyWarrantySearch("LOT-88")?.kind).toBe("batch");
    expect(classifyWarrantySearch("BATCH-2026-08")?.kind).toBe("batch");
  });
});

describe("findClaimsByWarrantySearch", () => {
  const claims = [
    {
      id: "claim-1",
      caseNumber: "WC-0001",
      customerName: "Rajesh Kumar",
      batchNumber: "BAT-LOT-2026-08",
      items: [{ serialNumber: null, batchNumber: "BAT-LOT-2026-08" }],
    },
    {
      id: "claim-2",
      caseNumber: "WC-0002",
      customerName: "Sita",
      items: [{ serialNumber: "BAT-45821", batchNumber: null }],
    },
  ];

  it("finds a claim by batch number the same way it finds by serial", () => {
    expect(findClaimsByWarrantySearch(claims, "BAT-LOT-2026-08").map((row) => row.id)).toEqual([
      "claim-1",
    ]);
    expect(findClaimsByWarrantySearch(claims, "bat-lot-2026-08").map((row) => row.id)).toEqual([
      "claim-1",
    ]);
    expect(findClaimsByWarrantySearch(claims, "BAT-45821").map((row) => row.id)).toEqual(["claim-2"]);
  });
});
