export const REPLACEMENT_ITEM_TYPES = ["battery", "charger", "controller", "motor"] as const;
export type ReplacementItemType = (typeof REPLACEMENT_ITEM_TYPES)[number];

export const REPLACEMENT_ITEM_TYPE_LABELS: Record<ReplacementItemType, string> = {
  battery: "Battery",
  charger: "Charger",
  controller: "Controller",
  motor: "Motor",
};

export const REPLACEMENT_ITEM_TYPE_OPTIONS = REPLACEMENT_ITEM_TYPES.map((value) => ({
  value,
  label: REPLACEMENT_ITEM_TYPE_LABELS[value],
}));

/** Letter totals and sections: battery, charger, motor, controller */
export const LETTER_ITEM_TYPE_ORDER = ["battery", "charger", "motor", "controller"] as const;

export const REPLACEMENT_ITEM_SIDES = ["old", "new"] as const;
export type ReplacementItemSide = (typeof REPLACEMENT_ITEM_SIDES)[number];

export const REPLACEMENT_ITEM_SIDE_LABELS: Record<ReplacementItemSide, string> = {
  old: "Old (Faulty)",
  new: "New (Replacement)",
};

export const REPLACEMENT_VOLTAGES = ["48V", "60V", "70V"] as const;
export type ReplacementVoltage = (typeof REPLACEMENT_VOLTAGES)[number];

export const REPLACEMENT_VOLTAGE_OPTIONS = REPLACEMENT_VOLTAGES.map((value) => ({
  value,
  label: value,
}));

export const REPLACEMENT_STATUSES = [
  "received_from_customer",
  "sent_to_company",
  "received_from_company",
  "returned_to_customer",
  "closed",
  "cancelled",
] as const;
export type ReplacementStatus = (typeof REPLACEMENT_STATUSES)[number];

export const REPLACEMENT_STATUS_LABELS: Record<ReplacementStatus, string> = {
  received_from_customer: "Received from customer",
  sent_to_company: "Sent to company",
  received_from_company: "Received from company",
  returned_to_customer: "Returned to customer",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const REPLACEMENT_STATUS_OPTIONS = REPLACEMENT_STATUSES.map((value) => ({
  value,
  label: REPLACEMENT_STATUS_LABELS[value],
}));

/** Statuses eligible for company replacement letter */
export const LETTER_ELIGIBLE_STATUSES: ReplacementStatus[] = [
  "received_from_customer",
  "sent_to_company",
];

export const REPLACEMENT_COMPANY = {
  name: "Maa Lakshmi E-Vehicles Pvt. Ltd. (Yakuza)",
  address: "Sirsa, Haryana",
} as const;

export function parseReplacementDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatReplacementDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatReplacementItemType(type: string | null | undefined): string {
  if (!type) return "—";
  return REPLACEMENT_ITEM_TYPE_LABELS[type as ReplacementItemType] ?? type;
}

export function formatReplacementStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return REPLACEMENT_STATUS_LABELS[status as ReplacementStatus] ?? status;
}

export function formatItemSpecs(item: {
  itemType: string;
  ah?: number | null;
  voltage?: string | null;
  quantity?: number | null;
}): string {
  const parts: string[] = [];
  if (item.itemType === "battery" && item.ah != null) {
    parts.push(`${item.ah} AH`);
  }
  if (item.itemType === "charger" && item.voltage) {
    parts.push(item.voltage);
  }
  if (item.quantity != null && item.quantity > 1) {
    parts.push(`Qty ${item.quantity}`);
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

export type SerializedReplacementClaimItem = {
  id: string;
  itemType: ReplacementItemType;
  side: ReplacementItemSide;
  modelCode: string | null;
  serialNumber: string | null;
  ah: number | null;
  voltage: ReplacementVoltage | null;
  quantity: number;
  notes: string | null;
  sortOrder: number;
};

export type SerializedReplacementClaim = {
  id: string;
  receivedDate: string;
  customerName: string;
  customerPhone: string | null;
  billNumber: string | null;
  status: ReplacementStatus;
  sentToCompanyDate: string | null;
  companyReceivedDate: string | null;
  companyInvoiceNumber: string | null;
  companyDeliveryNote: string | null;
  returnedToCustomerDate: string | null;
  notes: string | null;
  items: SerializedReplacementClaimItem[];
  createdAt: string;
  updatedAt: string;
};

function formatOptionalDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

export function sumItemQuantities(
  items: Pick<SerializedReplacementClaimItem, "side" | "quantity">[],
  side: ReplacementItemSide,
): number {
  return items
    .filter((item) => item.side === side)
    .reduce((total, item) => total + (item.quantity ?? 1), 0);
}

/** Items still waiting to arrive from Yakuza / company */
export function isPendingFromCompany(claim: SerializedReplacementClaim): boolean {
  if (claim.status === "cancelled" || claim.status === "closed" || claim.status === "returned_to_customer") {
    return false;
  }

  if (claim.status === "sent_to_company") {
    return true;
  }

  const oldQty = sumItemQuantities(claim.items, "old");
  const newQty = sumItemQuantities(claim.items, "new");

  return claim.status === "received_from_company" && oldQty > 0 && newQty < oldQty;
}

export function pendingFromCompanySummary(claim: SerializedReplacementClaim): string {
  const oldQty = sumItemQuantities(claim.items, "old");
  const newQty = sumItemQuantities(claim.items, "new");
  const waiting = Math.max(oldQty - newQty, 0);

  if (waiting <= 0) {
    return claim.status === "sent_to_company" ? "Awaiting company shipment" : "—";
  }

  return `${waiting} item${waiting === 1 ? "" : "s"} pending from company`;
}

export function filterPendingFromCompanyClaims(
  claims: SerializedReplacementClaim[],
): SerializedReplacementClaim[] {
  return claims.filter(isPendingFromCompany);
}

/** Faulty items still sitting at the showroom, not yet sent to company */
export function isAtShowroom(claim: SerializedReplacementClaim): boolean {
  return claim.status === "received_from_customer";
}

export function filterAtShowroomClaims(
  claims: SerializedReplacementClaim[],
): SerializedReplacementClaim[] {
  return claims.filter(isAtShowroom);
}

/** Replacement has arrived from company and is waiting to be given to the customer */
export function isReadyForCustomer(claim: SerializedReplacementClaim): boolean {
  return claim.status === "received_from_company" && !isPendingFromCompany(claim);
}

export function filterReadyForCustomerClaims(
  claims: SerializedReplacementClaim[],
): SerializedReplacementClaim[] {
  return claims.filter(isReadyForCustomer);
}

function normalizeItemType(value: string): ReplacementItemType {
  return REPLACEMENT_ITEM_TYPES.includes(value as ReplacementItemType)
    ? (value as ReplacementItemType)
    : "battery";
}

function normalizeItemSide(value: string): ReplacementItemSide {
  return REPLACEMENT_ITEM_SIDES.includes(value as ReplacementItemSide)
    ? (value as ReplacementItemSide)
    : "old";
}

function normalizeStatus(value: string): ReplacementStatus {
  return REPLACEMENT_STATUSES.includes(value as ReplacementStatus)
    ? (value as ReplacementStatus)
    : "received_from_customer";
}

function normalizeVoltage(value: string | null | undefined): ReplacementVoltage | null {
  if (!value) return null;
  return REPLACEMENT_VOLTAGES.includes(value as ReplacementVoltage)
    ? (value as ReplacementVoltage)
    : null;
}

export function serializeReplacementClaimItem(item: {
  id: string;
  itemType: string;
  side: string;
  modelCode: string | null;
  serialNumber: string | null;
  ah: number | null;
  voltage: string | null;
  quantity: number;
  notes: string | null;
  sortOrder: number;
}): SerializedReplacementClaimItem {
  return {
    id: item.id,
    itemType: normalizeItemType(item.itemType),
    side: normalizeItemSide(item.side),
    modelCode: item.modelCode,
    serialNumber: item.serialNumber,
    ah: item.ah,
    voltage: normalizeVoltage(item.voltage),
    quantity: item.quantity,
    notes: item.notes,
    sortOrder: item.sortOrder,
  };
}

export function serializeReplacementClaim(claim: {
  id: string;
  receivedDate: Date;
  customerName: string;
  customerPhone: string | null;
  billNumber: string | null;
  status: string;
  sentToCompanyDate?: Date | null;
  companyReceivedDate?: Date | null;
  companyInvoiceNumber?: string | null;
  companyDeliveryNote?: string | null;
  returnedToCustomerDate?: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    itemType: string;
    side: string;
    modelCode: string | null;
    serialNumber: string | null;
    ah: number | null;
    voltage: string | null;
    quantity: number;
    notes: string | null;
    sortOrder: number;
  }[];
}): SerializedReplacementClaim {
  return {
    id: claim.id,
    receivedDate: claim.receivedDate.toISOString().slice(0, 10),
    customerName: claim.customerName,
    customerPhone: claim.customerPhone,
    billNumber: claim.billNumber,
    status: normalizeStatus(claim.status),
    sentToCompanyDate: formatOptionalDate(claim.sentToCompanyDate),
    companyReceivedDate: formatOptionalDate(claim.companyReceivedDate),
    companyInvoiceNumber: claim.companyInvoiceNumber ?? null,
    companyDeliveryNote: claim.companyDeliveryNote ?? null,
    returnedToCustomerDate: formatOptionalDate(claim.returnedToCustomerDate),
    notes: claim.notes,
    items: claim.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeReplacementClaimItem),
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  };
}

export type LetterItemRow = {
  claimId: string;
  receivedDate: string;
  customerName: string;
  billNumber: string | null;
  itemType: ReplacementItemType;
  modelCode: string | null;
  serialNumber: string | null;
  specs: string;
  quantity: number;
};

export function buildLetterItems(
  claims: SerializedReplacementClaim[],
): Record<ReplacementItemType, LetterItemRow[]> {
  const grouped: Record<ReplacementItemType, LetterItemRow[]> = {
    battery: [],
    charger: [],
    controller: [],
    motor: [],
  };

  for (const claim of claims) {
    for (const item of claim.items) {
      if (item.side !== "old") continue;
      grouped[item.itemType].push({
        claimId: claim.id,
        receivedDate: claim.receivedDate,
        customerName: claim.customerName,
        billNumber: claim.billNumber,
        itemType: item.itemType,
        modelCode: item.modelCode,
        serialNumber: item.serialNumber,
        specs: formatItemSpecs(item),
        quantity: item.quantity,
      });
    }
  }

  return grouped;
}

export function sumLetterQuantities(
  grouped: Record<ReplacementItemType, Pick<LetterItemRow, "quantity">[]>,
): Record<ReplacementItemType, number> & { total: number } {
  const battery = grouped.battery.reduce((sum, row) => sum + row.quantity, 0);
  const charger = grouped.charger.reduce((sum, row) => sum + row.quantity, 0);
  const controller = grouped.controller.reduce((sum, row) => sum + row.quantity, 0);
  const motor = grouped.motor.reduce((sum, row) => sum + row.quantity, 0);

  return {
    battery,
    charger,
    motor,
    controller,
    total: battery + charger + motor + controller,
  };
}

export function formatLetterQuantitySummary(
  totals: ReturnType<typeof sumLetterQuantities>,
): string {
  const parts = LETTER_ITEM_TYPE_ORDER.map(
    (type) => `${REPLACEMENT_ITEM_TYPE_LABELS[type]} ${totals[type]}`,
  );
  return `${parts.join(", ")} respectively — Grand total ${totals.total}`;
}

export const MOVEMENT_STAGES = [
  "receivedFromCustomer",
  "sentToCompany",
  "receivedFromCompany",
  "returnedToCustomer",
  "pendingAtCompany",
  "pendingWithUs",
] as const;
export type MovementStage = (typeof MOVEMENT_STAGES)[number];

export const MOVEMENT_STAGE_LABELS: Record<MovementStage, string> = {
  receivedFromCustomer: "Received from customer",
  sentToCompany: "Sent to company",
  receivedFromCompany: "Received from company",
  returnedToCustomer: "Returned to customer",
  pendingAtCompany: "Pending at company",
  pendingWithUs: "Pending with us",
};

export type TypeQuantityTotals = Record<ReplacementItemType, number> & { total: number };

export type MovementReportRow = {
  claimId: string;
  receivedDate: string;
  customerName: string;
  customerPhone: string | null;
  billNumber: string | null;
  oldItems: string;
  newItems: string;
  sentToCompanyDate: string | null;
  companyReceivedDate: string | null;
  status: ReplacementStatus;
  location: string;
  pendingAtCompany: number;
  pendingWithUs: number;
};

export type MovementReport = {
  stages: Record<MovementStage, TypeQuantityTotals>;
  rows: MovementReportRow[];
};

function emptyTypeTotals(): TypeQuantityTotals {
  return { battery: 0, charger: 0, motor: 0, controller: 0, total: 0 };
}

function addTypeQuantity(
  totals: TypeQuantityTotals,
  itemType: ReplacementItemType,
  quantity: number,
) {
  if (quantity <= 0) return;
  totals[itemType] += quantity;
  totals.total += quantity;
}

export function quantitiesByType(
  items: Pick<SerializedReplacementClaimItem, "itemType" | "side" | "quantity">[],
  side: ReplacementItemSide,
): TypeQuantityTotals {
  const totals = emptyTypeTotals();
  for (const item of items) {
    if (item.side !== side) continue;
    addTypeQuantity(totals, item.itemType, item.quantity);
  }
  return totals;
}

export function summarizeReplacementItems(
  items: SerializedReplacementClaimItem[],
  side: ReplacementItemSide,
): string {
  const matching = items.filter((item) => item.side === side);
  if (matching.length === 0) return "—";
  return matching
    .map((item) => {
      const specs = formatItemSpecs(item);
      const model = item.modelCode ? ` ${item.modelCode}` : "";
      const serial = item.serialNumber ? ` / ${item.serialNumber}` : "";
      const specPart = specs !== "—" ? ` (${specs})` : "";
      return `${formatReplacementItemType(item.itemType)}${model}${serial}${specPart}`;
    })
    .join("; ");
}

const DISPATCHED_STATUSES: ReplacementStatus[] = [
  "sent_to_company",
  "received_from_company",
  "returned_to_customer",
  "closed",
];

const COMPANY_BACK_STATUSES: ReplacementStatus[] = [
  "received_from_company",
  "returned_to_customer",
  "closed",
];

const RETURNED_STATUSES: ReplacementStatus[] = ["returned_to_customer", "closed"];

export function claimMovementLocation(claim: SerializedReplacementClaim): string {
  if (claim.status === "cancelled") return "Cancelled";
  if (RETURNED_STATUSES.includes(claim.status)) return "Returned to customer";
  if (isPendingFromCompany(claim)) return "Pending at company";
  if (claim.status === "received_from_company") return "Pending with us";
  if (claim.status === "sent_to_company") return "Pending at company";
  if (claim.status === "received_from_customer") return "At showroom (not yet sent)";
  return formatReplacementStatus(claim.status);
}

export function buildMovementReport(claims: SerializedReplacementClaim[]): MovementReport {
  const stages = Object.fromEntries(
    MOVEMENT_STAGES.map((stage) => [stage, emptyTypeTotals()]),
  ) as Record<MovementStage, TypeQuantityTotals>;
  const rows: MovementReportRow[] = [];

  for (const claim of claims) {
    const oldQty = quantitiesByType(claim.items, "old");
    const newQty = quantitiesByType(claim.items, "new");
    const pendingAtCompanyByType = emptyTypeTotals();
    const pendingWithUsByType = emptyTypeTotals();

    if (claim.status !== "cancelled") {
      for (const type of LETTER_ITEM_TYPE_ORDER) {
        addTypeQuantity(stages.receivedFromCustomer, type, oldQty[type]);

        if (DISPATCHED_STATUSES.includes(claim.status)) {
          addTypeQuantity(stages.sentToCompany, type, oldQty[type]);
        }

        if (COMPANY_BACK_STATUSES.includes(claim.status)) {
          addTypeQuantity(stages.receivedFromCompany, type, newQty[type]);
        }

        if (RETURNED_STATUSES.includes(claim.status)) {
          addTypeQuantity(stages.returnedToCustomer, type, oldQty[type]);
        }

        if (claim.status === "sent_to_company") {
          addTypeQuantity(pendingAtCompanyByType, type, oldQty[type]);
        } else if (claim.status === "received_from_company") {
          addTypeQuantity(pendingAtCompanyByType, type, Math.max(oldQty[type] - newQty[type], 0));
          addTypeQuantity(pendingWithUsByType, type, newQty[type]);
        }
      }

      for (const type of LETTER_ITEM_TYPE_ORDER) {
        addTypeQuantity(stages.pendingAtCompany, type, pendingAtCompanyByType[type]);
        addTypeQuantity(stages.pendingWithUs, type, pendingWithUsByType[type]);
      }
    }

    rows.push({
      claimId: claim.id,
      receivedDate: claim.receivedDate,
      customerName: claim.customerName,
      customerPhone: claim.customerPhone,
      billNumber: claim.billNumber,
      oldItems: summarizeReplacementItems(claim.items, "old"),
      newItems: summarizeReplacementItems(claim.items, "new"),
      sentToCompanyDate: claim.sentToCompanyDate,
      companyReceivedDate: claim.companyReceivedDate,
      status: claim.status,
      location: claimMovementLocation(claim),
      pendingAtCompany: pendingAtCompanyByType.total,
      pendingWithUs: pendingWithUsByType.total,
    });
  }

  return { stages, rows };
}

export function replacementStatusVariant(
  status: ReplacementStatus,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "received_from_customer":
      return "warning";
    case "sent_to_company":
      return "info";
    case "received_from_company":
      return "info";
    case "returned_to_customer":
    case "closed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}
