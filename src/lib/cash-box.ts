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

export const CASH_BOX_AUDIT_ACTIONS = ["created", "updated", "deleted"] as const;
export type CashBoxAuditAction = (typeof CASH_BOX_AUDIT_ACTIONS)[number];

export type CashBoxSnapshot = {
  recordDate: string;
  sessionNumber: number;
  openingBalance: number;
  takenHome: number;
  notes: string | null;
  entries: {
    type: string;
    category: string;
    business: string | null;
    paymentMethod: string | null;
    description: string;
    amount: number;
  }[];
};

type SnapshotSource = {
  recordDate: Date | string;
  sessionNumber: number;
  openingBalance: number;
  takenHome: number;
  notes: string | null;
  entries: {
    type: string;
    category: string;
    business: string | null;
    paymentMethod: string | null;
    description: string;
    amount: number;
  }[];
};

function asIsoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function rupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function entryLine(entry: CashBoxSnapshot["entries"][number]): string {
  return `${entry.type} ${entry.description} (${rupees(entry.amount)})`;
}

function entryKey(entry: CashBoxSnapshot["entries"][number]): string {
  return [
    entry.type,
    entry.category,
    entry.business ?? "",
    entry.paymentMethod ?? "",
    entry.description.trim(),
    String(entry.amount),
  ].join("|");
}

export function snapshotCashBoxRecord(record: SnapshotSource): CashBoxSnapshot {
  return {
    recordDate: asIsoDate(record.recordDate),
    sessionNumber: record.sessionNumber,
    openingBalance: record.openingBalance,
    takenHome: record.takenHome,
    notes: record.notes,
    entries: record.entries.map((entry) => ({
      type: entry.type,
      category: entry.category,
      business: entry.business,
      paymentMethod: entry.paymentMethod,
      description: entry.description,
      amount: entry.amount,
    })),
  };
}

export function summarizeCashBoxChange(
  action: CashBoxAuditAction,
  before: CashBoxSnapshot | null,
  after: CashBoxSnapshot | null,
): string {
  const snapshot = after ?? before;
  const heading = snapshot
    ? `${formatRecordDate(snapshot.recordDate)}${snapshot.sessionNumber > 1 ? ` · session ${snapshot.sessionNumber}` : ""}`
    : "cash box record";

  if (action === "created" && after) {
    return `Created ${heading} · opening ${rupees(after.openingBalance)} · ${after.entries.length} line${after.entries.length === 1 ? "" : "s"}`;
  }

  if (action === "deleted" && before) {
    return `Deleted ${heading} · opening ${rupees(before.openingBalance)} · ${before.entries.length} line${before.entries.length === 1 ? "" : "s"}`;
  }

  if (action !== "updated" || !before || !after) {
    return `${action} ${heading}`;
  }

  const changes: string[] = [];
  if (before.recordDate !== after.recordDate) {
    changes.push(`date ${formatRecordDate(before.recordDate)} → ${formatRecordDate(after.recordDate)}`);
  }
  if (before.sessionNumber !== after.sessionNumber) {
    changes.push(`session ${before.sessionNumber} → ${after.sessionNumber}`);
  }
  if (before.openingBalance !== after.openingBalance) {
    changes.push(`opening ${rupees(before.openingBalance)} → ${rupees(after.openingBalance)}`);
  }
  if (before.takenHome !== after.takenHome) {
    changes.push(`taken home ${rupees(before.takenHome)} → ${rupees(after.takenHome)}`);
  }
  if ((before.notes ?? "") !== (after.notes ?? "")) {
    changes.push("notes changed");
  }

  const beforeKeys = before.entries.map(entryKey);
  const afterKeys = after.entries.map(entryKey);
  const removed = before.entries.filter((entry) => !afterKeys.includes(entryKey(entry)));
  const added = after.entries.filter((entry) => !beforeKeys.includes(entryKey(entry)));
  for (const entry of added) changes.push(`added ${entryLine(entry)}`);
  for (const entry of removed) changes.push(`removed ${entryLine(entry)}`);

  if (changes.length === 0) return `Updated ${heading} · no field changes`;
  return `Updated ${heading}: ${changes.join("; ")}`;
}

export function formatCashBoxTimestamp(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

export type SerializedCashBoxAuditLog = {
  id: string;
  action: CashBoxAuditAction;
  actorEmail: string;
  actorRole: string | null;
  summary: string;
  createdAt: string;
};

export function serializeCashBoxAuditLog(log: {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string | null;
  summary: string;
  createdAt: Date;
}): SerializedCashBoxAuditLog {
  return {
    id: log.id,
    action: CASH_BOX_AUDIT_ACTIONS.includes(log.action as CashBoxAuditAction)
      ? (log.action as CashBoxAuditAction)
      : "updated",
    actorEmail: log.actorEmail,
    actorRole: log.actorRole,
    summary: log.summary,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializeCashBoxRecord(record: SnapshotSource & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  entries: SnapshotSource["entries"];
  auditLogs?: {
    id: string;
    action: string;
    actorEmail: string;
    actorRole: string | null;
    summary: string;
    createdAt: Date;
  }[];
}) {
  const totals = computeCashBoxTotals(
    record.openingBalance,
    record.takenHome,
    record.entries.map((entry) => ({
      type: entry.type as "receipt" | "payment",
      amount: entry.amount,
      paymentMethod: entry.paymentMethod as "cash" | "phonepay" | "other" | null | undefined,
    })),
  );
  return {
    id: record.id,
    recordDate: asIsoDate(record.recordDate),
    sessionNumber: record.sessionNumber,
    openingBalance: record.openingBalance,
    takenHome: record.takenHome,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    entries: record.entries,
    history: record.auditLogs?.map(serializeCashBoxAuditLog) ?? [],
    ...totals,
  };
}
