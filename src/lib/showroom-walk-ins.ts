export const SHOWROOM_PAYMENT_MODES = [
  "cash",
  "online",
  "credit_card",
  "finance_bajaj",
] as const;

export type ShowroomPaymentMode = (typeof SHOWROOM_PAYMENT_MODES)[number];

export const SHOWROOM_PAYMENT_MODE_LABELS: Record<ShowroomPaymentMode, string> = {
  cash: "Cash",
  online: "Online",
  credit_card: "Credit Card",
  finance_bajaj: "Finance by Bajaj",
};

export const SHOWROOM_PAYMENT_MODE_OPTIONS = SHOWROOM_PAYMENT_MODES.map((value) => ({
  value,
  label: SHOWROOM_PAYMENT_MODE_LABELS[value],
}));

export function formatShowroomPaymentMode(mode: string | null | undefined): string {
  if (!mode) return "—";
  return SHOWROOM_PAYMENT_MODE_LABELS[mode as ShowroomPaymentMode] ?? mode;
}

export function parseShowroomDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatShowroomDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function serializeShowroomWalkIn<
  T extends {
    enquiryDate: Date;
    expectedPurchaseDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
>(record: T) {
  return {
    ...record,
    enquiryDate: record.enquiryDate.toISOString().slice(0, 10),
    expectedPurchaseDate: record.expectedPurchaseDate
      ? record.expectedPurchaseDate.toISOString().slice(0, 10)
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
