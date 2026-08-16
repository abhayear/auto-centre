import { describe, expect, it } from "vitest";
import {
  REPLACEMENT_COMPANY,
  REPLACEMENT_ITEM_TYPE_OPTIONS,
  REPLACEMENT_STATUS_OPTIONS,
  buildLetterItems,
  formatItemSpecs,
  formatReplacementDate,
  formatReplacementItemType,
  formatReplacementStatus,
  parseReplacementDateInput,
  replacementStatusVariant,
  serializeReplacementClaim,
} from "@/lib/replacement-parts";
import {
  replacementClaimSchema,
  replacementStatusUpdateSchema,
} from "@/lib/validators";

describe("replacement-parts validators", () => {
  it("accepts a valid replacement claim with old items", () => {
    const result = replacementClaimSchema.safeParse({
      receivedDate: "2026-08-16",
      customerName: "Rajesh Kumar",
      customerPhone: "9876543210",
      billNumber: "AG-1024",
      status: "received_from_customer",
      items: [
        {
          itemType: "battery",
          side: "old",
          modelCode: "LMKN/F2S/WB/12M",
          serialNumber: "SN12345",
          ah: 33.9,
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts charger with voltage", () => {
    const result = replacementClaimSchema.safeParse({
      receivedDate: "2026-08-16",
      customerName: "Suresh",
      items: [
        {
          itemType: "charger",
          side: "old",
          modelCode: "KYKM/A2G/12M",
          serialNumber: "CH789",
          voltage: "48V",
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one item", () => {
    const result = replacementClaimSchema.safeParse({
      receivedDate: "2026-08-16",
      customerName: "Rajesh Kumar",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = replacementStatusUpdateSchema.safeParse({
      id: "claim-1",
      status: "invalid_status",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid item type", () => {
    const result = replacementClaimSchema.safeParse({
      receivedDate: "2026-08-16",
      customerName: "Rajesh Kumar",
      items: [
        {
          itemType: "tyre",
          side: "old",
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("replacement-parts helpers", () => {
  it("parses date-only input as UTC midnight", () => {
    const date = parseReplacementDateInput("2026-08-16");
    expect(date.toISOString()).toBe("2026-08-16T00:00:00.000Z");
  });

  it("formats replacement status labels", () => {
    expect(formatReplacementStatus("sent_to_company")).toBe("Sent to company");
    expect(formatReplacementStatus(null)).toBe("—");
  });

  it("formats item type labels", () => {
    expect(formatReplacementItemType("controller")).toBe("Controller");
  });

  it("formats battery specs with AH and quantity", () => {
    expect(
      formatItemSpecs({ itemType: "battery", ah: 43, quantity: 2 }),
    ).toBe("43 AH, Qty 2");
  });

  it("formats charger specs with voltage", () => {
    expect(
      formatItemSpecs({ itemType: "charger", voltage: "60V", quantity: 1 }),
    ).toBe("60V");
  });

  it("formats replacement dates", () => {
    expect(formatReplacementDate("2026-08-16")).toMatch(/16/);
  });

  it("maps status to badge variants", () => {
    expect(replacementStatusVariant("received_from_customer")).toBe("warning");
    expect(replacementStatusVariant("closed")).toBe("success");
    expect(replacementStatusVariant("cancelled")).toBe("danger");
  });

  it("exposes item type and status options", () => {
    expect(REPLACEMENT_ITEM_TYPE_OPTIONS).toHaveLength(4);
    expect(REPLACEMENT_STATUS_OPTIONS).toHaveLength(6);
  });

  it("uses Yakuza company constants", () => {
    expect(REPLACEMENT_COMPANY.name).toContain("Yakuza");
    expect(REPLACEMENT_COMPANY.address).toContain("Sirsa");
  });

  it("builds letter items grouped by type from old items only", () => {
    const claim = serializeReplacementClaim({
      id: "claim-1",
      receivedDate: new Date("2026-08-16T00:00:00.000Z"),
      customerName: "Rajesh Kumar",
      customerPhone: "9876543210",
      billNumber: "AG-1024",
      status: "received_from_customer",
      notes: null,
      createdAt: new Date("2026-08-16T00:00:00.000Z"),
      updatedAt: new Date("2026-08-16T00:00:00.000Z"),
      items: [
        {
          id: "item-1",
          itemType: "battery",
          side: "old",
          modelCode: "LMKN/F2S/WB/12M",
          serialNumber: "SN12345",
          ah: 33.9,
          voltage: null,
          quantity: 1,
          notes: null,
          sortOrder: 0,
        },
        {
          id: "item-2",
          itemType: "battery",
          side: "new",
          modelCode: "LMKN/F2S/WB/12M",
          serialNumber: "SN99999",
          ah: 33.9,
          voltage: null,
          quantity: 1,
          notes: null,
          sortOrder: 1,
        },
        {
          id: "item-3",
          itemType: "charger",
          side: "old",
          modelCode: "KYKM/A2G/12M",
          serialNumber: "CH789",
          ah: null,
          voltage: "48V",
          quantity: 1,
          notes: null,
          sortOrder: 2,
        },
      ],
    });

    const grouped = buildLetterItems([claim]);
    expect(grouped.battery).toHaveLength(1);
    expect(grouped.charger).toHaveLength(1);
    expect(grouped.motor).toHaveLength(0);
    expect(grouped.battery[0].serialNumber).toBe("SN12345");
  });
});
