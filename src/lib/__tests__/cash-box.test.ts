import { describe, expect, it } from "vitest";
import { computeCashBoxTotals } from "@/lib/cash-box";

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
