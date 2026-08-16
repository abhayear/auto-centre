import { describe, expect, it } from "vitest";
import {
  REPLACEMENT_COMPANY,
  REPLACEMENT_ITEM_TYPE_OPTIONS,
  REPLACEMENT_STATUS_OPTIONS,
  LETTER_ITEM_TYPE_ORDER,
  buildLetterItems,
  buildMovementReport,
  claimMovementLocation,
  filterPendingFromCompanyClaims,
  isAtShowroom,
  formatLetterQuantitySummary,
  sumLetterQuantities,
  formatItemSpecs,
  formatReplacementDate,
  formatReplacementItemType,
  formatReplacementStatus,
  isPendingFromCompany,
  parseReplacementDateInput,
  pendingFromCompanySummary,
  replacementStatusVariant,
  serializeReplacementClaim,
} from "@/lib/replacement-parts";
import {
  replacementClaimSchema,
  replacementCompanyReceiptSchema,
  replacementSendToCompanySchema,
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
    expect(sumLetterQuantities(grouped)).toEqual({
      battery: 1,
      charger: 1,
      motor: 0,
      controller: 0,
      total: 2,
    });
  });

  it("sums letter quantities by item type, not row count", () => {
    const totals = sumLetterQuantities({
      battery: [{ quantity: 5 }, { quantity: 2 }],
      charger: [{ quantity: 3 }],
      controller: [{ quantity: 1 }],
      motor: [{ quantity: 2 }],
    });

    expect(totals).toEqual({
      battery: 7,
      charger: 3,
      motor: 2,
      controller: 1,
      total: 13,
    });
    expect(LETTER_ITEM_TYPE_ORDER).toEqual(["battery", "charger", "motor", "controller"]);
    expect(formatLetterQuantitySummary(totals)).toBe(
      "Battery 7, Charger 3, Motor 2, Controller 1 respectively — Grand total 13",
    );
  });

  it("treats sent-to-company claims as pending even without a bill", () => {
    const claim = serializeReplacementClaim({
      id: "claim-pending",
      receivedDate: new Date("2026-08-16T00:00:00.000Z"),
      customerName: "Mithilesh Shukla",
      customerPhone: null,
      billNumber: null,
      status: "sent_to_company",
      sentToCompanyDate: new Date("2026-08-16T00:00:00.000Z"),
      companyReceivedDate: null,
      companyInvoiceNumber: null,
      companyDeliveryNote: null,
      notes: null,
      createdAt: new Date("2026-08-16T00:00:00.000Z"),
      updatedAt: new Date("2026-08-16T00:00:00.000Z"),
      items: [
        {
          id: "item-old",
          itemType: "battery",
          side: "old",
          modelCode: "LMKN/F2S/WB/12M",
          serialNumber: null,
          ah: 43,
          voltage: null,
          quantity: 2,
          notes: null,
          sortOrder: 0,
        },
      ],
    });

    expect(isPendingFromCompany(claim)).toBe(true);
    expect(pendingFromCompanySummary(claim)).toBe("2 items pending from company");
    expect(filterPendingFromCompanyClaims([claim])).toHaveLength(1);
  });

  it("keeps partial company receipts on the pending list", () => {
    const claim = serializeReplacementClaim({
      id: "claim-partial",
      receivedDate: new Date("2026-08-16T00:00:00.000Z"),
      customerName: "Mohini Patel",
      customerPhone: null,
      billNumber: null,
      status: "received_from_company",
      sentToCompanyDate: new Date("2026-08-10T00:00:00.000Z"),
      companyReceivedDate: new Date("2026-08-16T00:00:00.000Z"),
      companyInvoiceNumber: null,
      companyDeliveryNote: "DN-44",
      notes: null,
      createdAt: new Date("2026-08-16T00:00:00.000Z"),
      updatedAt: new Date("2026-08-16T00:00:00.000Z"),
      items: [
        {
          id: "item-old",
          itemType: "charger",
          side: "old",
          modelCode: "KYKM/A2G/12M",
          serialNumber: null,
          ah: null,
          voltage: "60V",
          quantity: 2,
          notes: null,
          sortOrder: 0,
        },
        {
          id: "item-new",
          itemType: "charger",
          side: "new",
          modelCode: "KYKM/A2G/12M",
          serialNumber: "NEW-1",
          ah: null,
          voltage: "60V",
          quantity: 1,
          notes: null,
          sortOrder: 1,
        },
      ],
    });

    expect(isPendingFromCompany(claim)).toBe(true);
    expect(pendingFromCompanySummary(claim)).toBe("1 item pending from company");
  });

  it("builds a movement report with stage totals and ledger rows", () => {
    const atShowroom = serializeReplacementClaim({
      id: "claim-showroom",
      receivedDate: new Date("2026-08-01T00:00:00.000Z"),
      customerName: "Sani",
      customerPhone: "9005682289",
      billNumber: null,
      status: "received_from_customer",
      notes: null,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      items: [
        {
          id: "old-battery",
          itemType: "battery",
          side: "old",
          modelCode: "LMKV-F25",
          serialNumber: null,
          ah: 43,
          voltage: null,
          quantity: 5,
          notes: null,
          sortOrder: 0,
        },
      ],
    });

    const sent = serializeReplacementClaim({
      id: "claim-sent",
      receivedDate: new Date("2026-08-02T00:00:00.000Z"),
      customerName: "Satyendra Singh",
      customerPhone: null,
      billNumber: "119",
      status: "sent_to_company",
      sentToCompanyDate: new Date("2026-08-03T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-08-02T00:00:00.000Z"),
      updatedAt: new Date("2026-08-02T00:00:00.000Z"),
      items: [
        {
          id: "old-charger",
          itemType: "charger",
          side: "old",
          modelCode: "VLN/I24",
          serialNumber: null,
          ah: null,
          voltage: "60V",
          quantity: 1,
          notes: null,
          sortOrder: 0,
        },
      ],
    });

    const returned = serializeReplacementClaim({
      id: "claim-returned",
      receivedDate: new Date("2026-08-04T00:00:00.000Z"),
      customerName: "Rahul Bhagirath",
      customerPhone: null,
      billNumber: "172",
      status: "returned_to_customer",
      sentToCompanyDate: new Date("2026-08-05T00:00:00.000Z"),
      companyReceivedDate: new Date("2026-08-10T00:00:00.000Z"),
      notes: null,
      createdAt: new Date("2026-08-04T00:00:00.000Z"),
      updatedAt: new Date("2026-08-04T00:00:00.000Z"),
      items: [
        {
          id: "old-motor",
          itemType: "motor",
          side: "old",
          modelCode: "MMMM/K2S",
          serialNumber: "AL-1",
          ah: null,
          voltage: null,
          quantity: 1,
          notes: null,
          sortOrder: 0,
        },
        {
          id: "new-motor",
          itemType: "motor",
          side: "new",
          modelCode: "KYKM/M26",
          serialNumber: "NEW-1",
          ah: null,
          voltage: null,
          quantity: 1,
          notes: null,
          sortOrder: 1,
        },
      ],
    });

    const report = buildMovementReport([atShowroom, sent, returned]);

    expect(claimMovementLocation(atShowroom)).toBe("At showroom (not yet sent)");
    expect(isAtShowroom(atShowroom)).toBe(true);
    expect(isAtShowroom(sent)).toBe(false);
    expect(claimMovementLocation(sent)).toBe("Pending at company");
    expect(claimMovementLocation(returned)).toBe("Returned to customer");

    expect(report.stages.receivedFromCustomer).toEqual({
      battery: 5,
      charger: 1,
      motor: 1,
      controller: 0,
      total: 7,
    });
    expect(report.stages.sentToCompany.charger).toBe(1);
    expect(report.stages.sentToCompany.motor).toBe(1);
    expect(report.stages.sentToCompany.battery).toBe(0);
    expect(report.stages.receivedFromCompany.motor).toBe(1);
    expect(report.stages.returnedToCustomer.motor).toBe(1);
    expect(report.stages.pendingAtCompany.charger).toBe(1);
    expect(report.stages.pendingAtCompany.battery).toBe(0);
    expect(report.stages.pendingWithUs.total).toBe(0);
    expect(report.rows).toHaveLength(3);
    expect(report.rows[1].location).toBe("Pending at company");
  });
});

describe("company receipt validators", () => {
  it("accepts a receipt without invoice or delivery note", () => {
    const result = replacementCompanyReceiptSchema.safeParse({
      id: "claim-1",
      companyReceivedDate: "2026-08-16",
      items: [
        {
          itemType: "motor",
          side: "new",
          modelCode: "G2S/WB/12M",
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty company dates on a claim update", () => {
    const result = replacementClaimSchema.safeParse({
      receivedDate: "2026-08-16",
      customerName: "Raju Prasad",
      sentToCompanyDate: "",
      companyReceivedDate: "",
      items: [{ itemType: "controller", side: "old", quantity: 1 }],
    });

    expect(result.success).toBe(true);
  });

  it("accepts sending showroom claims to company", () => {
    const result = replacementSendToCompanySchema.safeParse({
      ids: ["claim-1", "claim-2"],
      sentToCompanyDate: "2026-08-16",
      courierNote: "DTDC AWB 921949267",
    });

    expect(result.success).toBe(true);
  });
});
