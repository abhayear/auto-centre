import { describe, expect, it } from "vitest";
import {
  computeCashBoxTotals,
  formatCashBoxTimestamp,
  snapshotCashBoxRecord,
  summarizeCashBoxChange,
} from "@/lib/cash-box";

describe("computeCashBoxTotals", () => {
  it("matches handwritten ledger example from 26/03/2026 session 1", () => {
    const totals = computeCashBoxTotals(2000, 38700, [
      { type: "receipt", amount: 180, paymentMethod: "phonepay" },
      { type: "receipt", amount: 20000, paymentMethod: "cash" },
      { type: "receipt", amount: 1000, paymentMethod: "cash" },
      { type: "receipt", amount: 18700, paymentMethod: "cash" },
      { type: "payment", amount: 50, paymentMethod: "cash" },
    ]);

    expect(totals.receipts).toBe(39700);
    expect(totals.nonCashReceipts).toBe(180);
    expect(totals.payments).toBe(50);
    expect(totals.closingBalance).toBe(2950);
  });

  it("matches afternoon session after carry-forward opening", () => {
    const totals = computeCashBoxTotals(2950, 0, [
      { type: "receipt", amount: 4380, paymentMethod: "cash" },
      { type: "receipt", amount: 450, paymentMethod: "phonepay" },
      { type: "payment", amount: 60, paymentMethod: "cash" },
      { type: "payment", amount: 30, paymentMethod: "cash" },
    ]);

    expect(totals.closingBalance).toBe(7240);
  });
});

describe("cash box edit history", () => {
  const base = snapshotCashBoxRecord({
    recordDate: "2026-03-26",
    sessionNumber: 1,
    openingBalance: 2000,
    takenHome: 38700,
    notes: null,
    entries: [
      {
        type: "receipt",
        category: "sale",
        business: "autogalaxy",
        paymentMethod: "cash",
        description: "Sale",
        amount: 20000,
      },
    ],
  });

  it("summarizes a new record", () => {
    expect(summarizeCashBoxChange("created", null, base)).toContain("Created");
    expect(summarizeCashBoxChange("created", null, base)).toContain("1 line");
  });

  it("lists opening balance and added lines on update", () => {
    const after = {
      ...base,
      openingBalance: 2500,
      entries: [
        ...base.entries,
        {
          type: "payment",
          category: "expense",
          business: "autogalaxy",
          paymentMethod: "cash",
          description: "Tea",
          amount: 50,
        },
      ],
    };
    const summary = summarizeCashBoxChange("updated", base, after);
    expect(summary).toContain("opening");
    expect(summary).toContain("added payment Tea");
  });

  it("summarizes a deleted record", () => {
    expect(summarizeCashBoxChange("deleted", base, null)).toContain("Deleted");
  });

  it("formats timestamps in India time", () => {
    expect(formatCashBoxTimestamp("2026-03-26T10:30:00.000Z")).toMatch(/26 Mar 2026/);
    expect(formatCashBoxTimestamp("2026-03-26T10:30:00.000Z")).toMatch(/4:00/i);
  });
});
