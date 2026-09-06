import { describe, expect, it } from "vitest";
import {
  buildWarrantyDashboard,
  nextWarrantyCaseNumber,
  warrantySummaryComment,
  normalizeItemCode,
  recommendAllocation,
  remainingWarrantyMonths,
  type AllocationClaim,
  type AllocationStockItem,
} from "@/lib/warranty-allocation";

const today = "2026-10-10";

function claim(overrides: Partial<AllocationClaim> = {}): AllocationClaim {
  return {
    id: "claim-1",
    caseNumber: "WC-0001",
    customerName: "Raj",
    status: "sent_to_company",
    destination: "plant",
    billDate: "2026-01-10",
    warrantyMonths: 12,
    receivedDate: "2026-09-01",
    allocatedStockId: null,
    items: [
      {
        itemType: "battery",
        side: "old",
        modelCode: "LMKN/F2S/WB/12M",
        ah: 33.9,
        voltage: null,
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

function stock(overrides: Partial<AllocationStockItem> = {}): AllocationStockItem {
  return {
    id: "stock-1",
    itemType: "battery",
    modelCode: "LMKN/F2S/WB/12M",
    ah: 33.9,
    voltage: null,
    status: "available",
    receivedDate: "2026-10-01",
    ...overrides,
  };
}

describe("nextWarrantyCaseNumber", () => {
  it("starts at WC-0001 when none exist", () => {
    expect(nextWarrantyCaseNumber([])).toBe("WC-0001");
  });

  it("increments the highest existing WC number", () => {
    expect(nextWarrantyCaseNumber(["WC-0001", "WC-0012", "AG-9"])).toBe("WC-0013");
  });
});

describe("normalizeItemCode", () => {
  it("trims and compares codes case-insensitively", () => {
    expect(normalizeItemCode(" lmkn/f2s/wb/12m ")).toBe("LMKN/F2S/WB/12M");
  });
});

describe("remainingWarrantyMonths", () => {
  it("returns whole months left from bill date plus warranty months", () => {
    expect(remainingWarrantyMonths("2026-01-10", 12, today)).toBe(3);
  });

  it("returns 0 when warranty has expired", () => {
    expect(remainingWarrantyMonths("2025-01-10", 12, today)).toBe(0);
  });

  it("returns null when bill date or months are missing", () => {
    expect(remainingWarrantyMonths(null, 12, today)).toBeNull();
    expect(remainingWarrantyMonths("2026-01-10", null, today)).toBeNull();
  });
});

describe("recommendAllocation", () => {
  it("recommends the exact model code and prefers the oldest stock", () => {
    const newer = stock({ id: "newer", receivedDate: "2026-10-05" });
    const older = stock({ id: "older", receivedDate: "2026-09-20" });

    const result = recommendAllocation(claim(), [newer, older], today);

    expect(result.kind).toBe("exact");
    expect(result.stockId).toBe("older");
    expect(result.reason).toMatch(/exact/i);
  });

  it("when warranty is 3 months or less, recommends the oldest compatible same-type stock", () => {
    const olderOtherCode = stock({
      id: "older-other",
      modelCode: "LMKV-F25",
      receivedDate: "2026-08-01",
    });
    const newerOtherCode = stock({
      id: "newer-other",
      modelCode: "G2S/WB/12M",
      receivedDate: "2026-09-15",
    });

    const result = recommendAllocation(claim(), [newerOtherCode, olderOtherCode], today);

    expect(result.kind).toBe("urgent_oldest");
    expect(result.stockId).toBe("older-other");
    expect(result.urgent).toBe(true);
    expect(result.remainingMonths).toBe(3);
  });

  it("waits for the exact code when warranty remaining is more than 3 months", () => {
    const other = stock({ id: "other", modelCode: "LMKV-F25" });

    const result = recommendAllocation(
      claim({ billDate: "2026-08-01", warrantyMonths: 12 }),
      [other],
      today,
    );

    expect(result.kind).toBe("wait");
    expect(result.stockId).toBeNull();
    expect(result.urgent).toBe(false);
  });

  it("does not use rejected or already allocated stock", () => {
    const taken = stock({ id: "taken", status: "allocated" });
    const rejected = stock({
      id: "rejected",
      modelCode: "LMKN/F2S/WB/12M",
      status: "rejected",
    });

    const result = recommendAllocation(claim(), [taken, rejected], today);

    expect(result.kind).toBe("wait");
    expect(result.stockId).toBeNull();
  });

  it("does not treat a different item type as compatible", () => {
    const charger = stock({
      id: "chg",
      itemType: "charger",
      modelCode: "KYKM/A2G/12M",
      voltage: "48V",
      ah: null,
    });

    const result = recommendAllocation(claim(), [charger], today);

    expect(result.kind).toBe("wait");
    expect(result.stockId).toBeNull();
  });
});

describe("buildWarrantyDashboard", () => {
  it("counts customer / Autogalaxy / plant / company pending by item type", () => {
    const dashboard = buildWarrantyDashboard(
      [
        claim({
          id: "c-showroom",
          status: "received_from_customer",
          destination: null,
        }),
        claim({
          id: "c-plant",
          status: "sent_to_company",
          destination: "plant",
          items: [
            {
              itemType: "battery",
              side: "old",
              modelCode: "LMKN/F2S/WB/12M",
              ah: 33.9,
              voltage: null,
              quantity: 1,
            },
          ],
        }),
        claim({
          id: "c-company",
          status: "sent_to_company",
          destination: "company",
          items: [
            {
              itemType: "charger",
              side: "old",
              modelCode: "KYKM/A2G/12M",
              ah: null,
              voltage: "48V",
              quantity: 1,
            },
          ],
        }),
      ],
      [stock({ id: "avail", itemType: "battery" })],
      today,
    );

    expect(dashboard.rows.battery.customerPending).toBe(2);
    expect(dashboard.rows.battery.autogalaxy).toBe(2);
    expect(dashboard.rows.battery.plant).toBe(1);
    expect(dashboard.rows.battery.company).toBe(0);
    expect(dashboard.rows.charger.customerPending).toBe(1);
    expect(dashboard.rows.charger.company).toBe(1);
    expect(dashboard.totals.customerPending).toBe(3);

    expect(dashboard.plantPending).toHaveLength(1);
    expect(dashboard.companyPending).toHaveLength(1);
    expect(dashboard.availableStock).toHaveLength(1);
    expect(dashboard.customerPending.some((row) => row.urgent)).toBe(true);
    expect(dashboard.allocatedCustomers).toEqual([]);
    expect(dashboard.returnedCustomers).toEqual([]);
    expect(dashboard.customerHeadcount).toEqual({
      customerPending: 3,
      autogalaxy: 1,
      plant: 1,
      company: 1,
      total: 3,
    });
    expect(dashboard.customersByType.battery).toEqual({
      customerPending: 2,
      autogalaxy: 1,
      plant: 1,
      company: 0,
      total: 2,
    });
    expect(dashboard.customersByType.charger).toEqual({
      customerPending: 1,
      autogalaxy: 0,
      plant: 0,
      company: 1,
      total: 1,
    });
    expect(dashboard.outcomes.battery.pending).toBe(2);
    expect(dashboard.outcomes.charger.pending).toBe(1);
    expect(dashboard.outcomeTotals).toEqual({
      pending: 3,
      allocated: 0,
      returned: 0,
      given: 0,
    });
  });

  it("lists allocated customers separately from returned customers", () => {
    const dashboard = buildWarrantyDashboard(
      [
        claim({
          id: "c-waiting",
          status: "received_from_customer",
          destination: null,
        }),
        claim({
          id: "c-allocated",
          customerName: "Allocated Raj",
          status: "received_from_company",
          allocatedStockId: "stock-9",
        }),
        claim({
          id: "c-returned",
          customerName: "Returned Raj",
          status: "returned_to_customer",
          allocatedStockId: "stock-8",
          returnedToCustomerDate: "2026-10-05",
        }),
      ],
      [],
      today,
    );

    expect(dashboard.allocatedCustomers.map((row) => row.claimId)).toEqual(["c-allocated"]);
    expect(dashboard.returnedCustomers.map((row) => row.claimId)).toEqual(["c-returned"]);
    expect(dashboard.customerPending.map((row) => row.claimId)).toEqual(["c-waiting"]);
    expect(dashboard.customerHeadcount.customerPending).toBe(2);
    expect(dashboard.customerHeadcount.autogalaxy).toBe(2);
    expect(dashboard.customerHeadcount.total).toBe(2);
    expect(dashboard.outcomes.battery).toEqual({
      pending: 1,
      allocated: 1,
      returned: 1,
      given: 2,
    });
    expect(dashboard.outcomeTotals).toEqual({
      pending: 1,
      allocated: 1,
      returned: 1,
      given: 2,
    });
  });

  it("lists waiting customer names oldest date first", () => {
    const dashboard = buildWarrantyDashboard(
      [
        claim({
          id: "newer",
          customerName: "New Raj",
          receivedDate: "2026-10-08",
          status: "received_from_customer",
          destination: null,
        }),
        claim({
          id: "older",
          customerName: "Old Raj",
          receivedDate: "2026-09-01",
          status: "received_from_customer",
          destination: null,
        }),
      ],
      [],
      today,
    );

    expect(dashboard.customerPending.map((row) => row.customerName)).toEqual([
      "Old Raj",
      "New Raj",
    ]);
    expect(dashboard.customerPending.map((row) => row.date)).toEqual([
      "2026-09-01",
      "2026-10-08",
    ]);
  });
});

describe("warrantySummaryComment", () => {
  it("writes a one-line customer summary for the simple report", () => {
    expect(
      warrantySummaryComment({
        customerPending: 3,
        autogalaxy: 1,
        plant: 1,
        company: 1,
        total: 3,
      }),
    ).toBe("3 customers pending for replacement. Autogalaxy 1, Plant 1, Company 1.");
  });
});
