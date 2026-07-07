export const CASH_ENTRY_TYPES = ["receipt", "payment"] as const;
export type CashEntryType = (typeof CASH_ENTRY_TYPES)[number];

export const CASH_CATEGORIES = [
  "sale",
  "service",
  "advance",
  "expense",
  "other",
] as const;
export type CashCategory = (typeof CASH_CATEGORIES)[number];

export const CASH_BUSINESSES = ["ecomotive", "autogalaxy", "other"] as const;
export type CashBusiness = (typeof CASH_BUSINESSES)[number];

export const CASH_PAYMENT_METHODS = ["cash", "phonepay", "other"] as const;
export type CashPaymentMethod = (typeof CASH_PAYMENT_METHODS)[number];

export type CashBoxEntryInput = {
  type: CashEntryType;
  category: CashCategory;
  business?: CashBusiness | null;
  paymentMethod?: CashPaymentMethod | null;
  description: string;
  amount: number;
  sortOrder?: number;
};

export type CashBoxTotals = {
  receipts: number;
  payments: number;
  nonCashReceipts: number;
  closingBalance: number;
};

function entryAffectsCashBox(entry: Pick<CashBoxEntryInput, "paymentMethod">): boolean {
  return !entry.paymentMethod || entry.paymentMethod === "cash";
}

export function computeCashBoxTotals(
  openingBalance: number,
  takenHome: number,
  entries: Pick<CashBoxEntryInput, "type" | "amount" | "paymentMethod">[],
): CashBoxTotals {
  const cashEntries = entries.filter(entryAffectsCashBox);
  const receipts = cashEntries
    .filter((entry) => entry.type === "receipt")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const payments = cashEntries
    .filter((entry) => entry.type === "payment")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const nonCashReceipts = entries
    .filter((entry) => entry.type === "receipt" && !entryAffectsCashBox(entry))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const closingBalance = openingBalance + receipts - payments - takenHome;

  return { receipts, payments, nonCashReceipts, closingBalance };
}

export function formatRecordDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function parseRecordDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
