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

export type SerializedShowroomWalkIn = {
  id: string;
  enquiryDate: string;
  name: string;
  requiredModel: string;
  contactNumber: string | null;
  address: string | null;
  paymentMode: ShowroomPaymentMode | null;
  expectedPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizePaymentMode(value: string | null | undefined): ShowroomPaymentMode | null {
  if (!value) return null;
  return SHOWROOM_PAYMENT_MODES.includes(value as ShowroomPaymentMode)
    ? (value as ShowroomPaymentMode)
    : null;
}

export function serializeShowroomWalkIn(record: {
  id: string;
  enquiryDate: Date;
  name: string;
  requiredModel: string;
  contactNumber: string | null;
  address: string | null;
  paymentMode: string | null;
  expectedPurchaseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedShowroomWalkIn {
  return {
    id: record.id,
    name: record.name,
    requiredModel: record.requiredModel,
    contactNumber: record.contactNumber,
    address: record.address,
    paymentMode: normalizePaymentMode(record.paymentMode),
    enquiryDate: record.enquiryDate.toISOString().slice(0, 10),
    expectedPurchaseDate: record.expectedPurchaseDate
      ? record.expectedPurchaseDate.toISOString().slice(0, 10)
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
