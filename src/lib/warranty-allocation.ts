import { LETTER_ITEM_TYPE_ORDER, type ReplacementItemType } from "@/lib/replacement-parts";

export const WARRANTY_CASE_PREFIX = "WC-";
export const URGENT_WARRANTY_MONTHS = 3;

export const REPLACEMENT_DESTINATIONS = ["plant", "company"] as const;
export type ReplacementDestination = (typeof REPLACEMENT_DESTINATIONS)[number];

export const REPLACEMENT_DESTINATION_LABELS: Record<ReplacementDestination, string> = {
  plant: "Plant",
  company: "Company",
};

export const REPLACEMENT_DESTINATION_OPTIONS = REPLACEMENT_DESTINATIONS.map((value) => ({
  value,
  label: REPLACEMENT_DESTINATION_LABELS[value],
}));

export const REPLACEMENT_RECEIVED_FROM_OPTIONS = REPLACEMENT_DESTINATIONS.map((value) => ({
  value,
  label: value === "plant" ? "Received from Plant" : "Received from Company",
}));

export const REPLACEMENT_STOCK_RESULTS = ["repaired", "replacement", "rejected"] as const;
export type ReplacementStockResult = (typeof REPLACEMENT_STOCK_RESULTS)[number];

export const REPLACEMENT_STOCK_STATUSES = ["available", "allocated", "rejected"] as const;
export type ReplacementStockStatus = (typeof REPLACEMENT_STOCK_STATUSES)[number];

export type AllocationItem = {
  itemType: ReplacementItemType | string;
  side: "old" | "new" | string;
  modelCode: string | null;
  ah: number | null;
  voltage: string | null;
  quantity: number;
};

export type AllocationClaim = {
  id: string;
  caseNumber: string | null;
  customerName: string;
  status: string;
  destination: string | null;
  billDate: string | null;
  warrantyMonths: number | null;
  receivedDate: string;
  sentToCompanyDate?: string | null;
  allocatedStockId: string | null;
  returnedToCustomerDate?: string | null;
  items: AllocationItem[];
};

export type AllocationStockItem = {
  id: string;
  itemType: ReplacementItemType | string;
  modelCode: string | null;
  ah: number | null;
  voltage: string | null;
  status: ReplacementStockStatus | string;
  receivedDate: string;
};

export type AllocationKind = "exact" | "urgent_oldest" | "wait";

export type AllocationRecommendation = {
  kind: AllocationKind;
  stockId: string | null;
  reason: string;
  remainingMonths: number | null;
  urgent: boolean;
};

export type DashboardTypeCounts = {
  customerPending: number;
  autogalaxy: number;
  plant: number;
  company: number;
  total: number;
};

export type DashboardOutcomeCounts = {
  pending: number;
  allocated: number;
  returned: number;
  given: number;
};

export type WarrantyDashboard = {
  rows: Record<ReplacementItemType, DashboardTypeCounts>;
  totals: DashboardTypeCounts;
  customersByType: Record<ReplacementItemType, DashboardTypeCounts>;
  customerHeadcount: DashboardTypeCounts;
  outcomes: Record<ReplacementItemType, DashboardOutcomeCounts>;
  outcomeTotals: DashboardOutcomeCounts;
  plantPending: DashboardListRow[];
  companyPending: DashboardListRow[];
  customerPending: DashboardCustomerRow[];
  allocatedCustomers: DashboardCustomerRow[];
  returnedCustomers: DashboardListRow[];
  availableStock: AllocationStockItem[];
};

export type DashboardListRow = {
  claimId: string;
  customerName: string;
  modelCode: string | null;
  date: string;
  daysPending: number;
};

export type DashboardCustomerRow = {
  claimId: string;
  caseNumber: string | null;
  customerName: string;
  modelCode: string | null;
  date: string;
  remainingMonths: number | null;
  urgent: boolean;
  recommendation: AllocationRecommendation;
};

const CLOSED_STATUSES = new Set(["returned_to_customer", "closed", "cancelled"]);

export function normalizeItemCode(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export function codesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeItemCode(a);
  const right = normalizeItemCode(b);
  return left.length > 0 && left === right;
}

export function nextWarrantyCaseNumber(existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    const match = /^WC-(\d+)$/i.exec(value.trim());
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `${WARRANTY_CASE_PREFIX}${String(max + 1).padStart(4, "0")}`;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function remainingWarrantyMonths(
  billDate: string | null | undefined,
  warrantyMonths: number | null | undefined,
  today: string,
): number | null {
  if (!billDate || warrantyMonths == null || warrantyMonths <= 0) return null;

  const start = parseDateOnly(billDate);
  const now = parseDateOnly(today);
  const expiry = addUtcMonths(start, warrantyMonths);
  if (now >= expiry) return 0;

  let months =
    (expiry.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (expiry.getUTCMonth() - now.getUTCMonth());
  if (now.getUTCDate() > expiry.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

function isUrgent(remainingMonths: number | null): boolean {
  return remainingMonths != null && remainingMonths <= URGENT_WARRANTY_MONTHS;
}

function primaryOldItem(claim: AllocationClaim): AllocationItem | undefined {
  return claim.items.find((item) => item.side === "old");
}

function availableStock(items: AllocationStockItem[]): AllocationStockItem[] {
  return items.filter((item) => item.status === "available");
}

function specsCompatible(item: AllocationItem, candidate: AllocationStockItem): boolean {
  if (item.itemType !== candidate.itemType) return false;
  if (item.ah != null && candidate.ah != null && item.ah !== candidate.ah) return false;
  if (item.voltage && candidate.voltage && item.voltage !== candidate.voltage) return false;
  return true;
}

function oldestFirst(items: AllocationStockItem[]): AllocationStockItem[] {
  return items.slice().sort((a, b) => {
    if (a.receivedDate === b.receivedDate) return a.id.localeCompare(b.id);
    return a.receivedDate < b.receivedDate ? -1 : 1;
  });
}

export function recommendAllocation(
  claim: AllocationClaim,
  stockItems: AllocationStockItem[],
  today: string,
): AllocationRecommendation {
  const remainingMonths = remainingWarrantyMonths(claim.billDate, claim.warrantyMonths, today);
  const urgent = isUrgent(remainingMonths);
  const submitted = primaryOldItem(claim);
  const open = availableStock(stockItems);

  if (!submitted) {
    return {
      kind: "wait",
      stockId: null,
      reason: "No submitted item code",
      remainingMonths,
      urgent,
    };
  }

  const exact = oldestFirst(open.filter((item) => codesMatch(item.modelCode, submitted.modelCode)));
  if (exact[0]) {
    return {
      kind: "exact",
      stockId: exact[0].id,
      reason: "Exact same item code",
      remainingMonths,
      urgent,
    };
  }

  if (urgent) {
    const compatible = oldestFirst(open.filter((item) => specsCompatible(submitted, item)));
    if (compatible[0]) {
      return {
        kind: "urgent_oldest",
        stockId: compatible[0].id,
        reason: "Urgent warranty — oldest compatible stock",
        remainingMonths,
        urgent,
      };
    }
  }

  return {
    kind: "wait",
    stockId: null,
    reason: urgent ? "No compatible stock available" : "Wait for exact code",
    remainingMonths,
    urgent,
  };
}

function emptyCounts(): DashboardTypeCounts {
  return { customerPending: 0, autogalaxy: 0, plant: 0, company: 0, total: 0 };
}

function emptyOutcome(): DashboardOutcomeCounts {
  return { pending: 0, allocated: 0, returned: 0, given: 0 };
}

function emptyOutcomeRows(): Record<ReplacementItemType, DashboardOutcomeCounts> {
  return {
    battery: emptyOutcome(),
    charger: emptyOutcome(),
    motor: emptyOutcome(),
    controller: emptyOutcome(),
  };
}

function addOldItemQty(
  outcomes: Record<ReplacementItemType, DashboardOutcomeCounts>,
  items: AllocationItem[],
  field: "pending" | "allocated" | "returned",
) {
  for (const item of items) {
    if (item.side !== "old") continue;
    outcomes[asItemType(item.itemType)][field] += item.quantity || 1;
  }
}

function finalizeOutcomes(
  outcomes: Record<ReplacementItemType, DashboardOutcomeCounts>,
): DashboardOutcomeCounts {
  const totals = emptyOutcome();
  for (const type of LETTER_ITEM_TYPE_ORDER) {
    const row = outcomes[type];
    row.given = row.allocated + row.returned;
    totals.pending += row.pending;
    totals.allocated += row.allocated;
    totals.returned += row.returned;
    totals.given += row.given;
  }
  return totals;
}

function asItemType(value: string): ReplacementItemType {
  return LETTER_ITEM_TYPE_ORDER.includes(value as ReplacementItemType)
    ? (value as ReplacementItemType)
    : "battery";
}

function isOpenClaim(claim: AllocationClaim): boolean {
  return !CLOSED_STATUSES.has(claim.status);
}

function emptyIdSets() {
  return {
    customerPending: new Set<string>(),
    autogalaxy: new Set<string>(),
    plant: new Set<string>(),
    company: new Set<string>(),
    total: new Set<string>(),
  };
}

function countsFromSets(sets: ReturnType<typeof emptyIdSets>): DashboardTypeCounts {
  return {
    customerPending: sets.customerPending.size,
    autogalaxy: sets.autogalaxy.size,
    plant: sets.plant.size,
    company: sets.company.size,
    total: sets.total.size,
  };
}

function sortByDateThenName<T extends { date: string; customerName: string }>(rows: T[]): T[] {
  return rows.sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    if (byDate !== 0) return byDate;
    return left.customerName.localeCompare(right.customerName);
  });
}

function addCustomerToSets(
  sets: ReturnType<typeof emptyIdSets>,
  claimId: string,
  location: { autogalaxy?: boolean; plant?: boolean; company?: boolean },
) {
  sets.customerPending.add(claimId);
  sets.total.add(claimId);
  if (location.autogalaxy) sets.autogalaxy.add(claimId);
  if (location.plant) sets.plant.add(claimId);
  if (location.company) sets.company.add(claimId);
}

function daysBetween(from: string, today: string): number {
  const start = parseDateOnly(from);
  const end = parseDateOnly(today);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function oldModelCode(claim: AllocationClaim): string | null {
  return primaryOldItem(claim)?.modelCode ?? null;
}

export function claimToAllocationClaim(claim: {
  id: string;
  caseNumber?: string | null;
  customerName: string;
  status: string;
  destination?: string | null;
  billDate?: string | null;
  warrantyMonths?: number | null;
  receivedDate: string;
  sentToCompanyDate?: string | null;
  allocatedStockId?: string | null;
  returnedToCustomerDate?: string | null;
  items: AllocationItem[];
}): AllocationClaim {
  return {
    id: claim.id,
    caseNumber: claim.caseNumber ?? null,
    customerName: claim.customerName,
    status: claim.status,
    destination: claim.destination ?? null,
    billDate: claim.billDate ?? null,
    warrantyMonths: claim.warrantyMonths ?? null,
    receivedDate: claim.receivedDate,
    sentToCompanyDate: claim.sentToCompanyDate ?? null,
    allocatedStockId: claim.allocatedStockId ?? null,
    returnedToCustomerDate: claim.returnedToCustomerDate ?? null,
    items: claim.items,
  };
}

export function buildWarrantyDashboard(
  claims: AllocationClaim[],
  stockItems: AllocationStockItem[],
  today: string,
): WarrantyDashboard {
  const rows = {
    battery: emptyCounts(),
    charger: emptyCounts(),
    motor: emptyCounts(),
    controller: emptyCounts(),
  } as Record<ReplacementItemType, DashboardTypeCounts>;

  const plantPending: DashboardListRow[] = [];
  const companyPending: DashboardListRow[] = [];
  const customerPending: DashboardCustomerRow[] = [];
  const allocatedCustomers: DashboardCustomerRow[] = [];
  const returnedCustomers: DashboardListRow[] = [];
  const customerIds = emptyIdSets();
  const customersByTypeSets = {
    battery: emptyIdSets(),
    charger: emptyIdSets(),
    motor: emptyIdSets(),
    controller: emptyIdSets(),
  } as Record<ReplacementItemType, ReturnType<typeof emptyIdSets>>;
  const available = availableStock(stockItems);
  const outcomes = emptyOutcomeRows();

  for (const claim of claims) {
    if (claim.status === "returned_to_customer" || claim.returnedToCustomerDate) {
      returnedCustomers.push({
        claimId: claim.id,
        customerName: claim.customerName,
        modelCode: oldModelCode(claim),
        date: claim.returnedToCustomerDate ?? claim.receivedDate,
        daysPending: daysBetween(claim.returnedToCustomerDate ?? claim.receivedDate, today),
      });
      addOldItemQty(outcomes, claim.items, "returned");
      continue;
    }

    if (!isOpenClaim(claim)) continue;

    const recommendation = recommendAllocation(claim, stockItems, today);
    const remainingMonths = recommendation.remainingMonths;
    const customerRow = {
      claimId: claim.id,
      caseNumber: claim.caseNumber,
      customerName: claim.customerName,
      modelCode: oldModelCode(claim),
      date: claim.receivedDate,
      remainingMonths,
      urgent: recommendation.urgent,
      recommendation,
    };

    const atShowroom = claim.status === "received_from_customer";
    const outbound = claim.status === "sent_to_company";
    const atPlant = outbound && claim.destination === "plant";
    const atCompany = outbound && !atPlant;
    const atAutogalaxy = Boolean(claim.allocatedStockId) || atShowroom;
    const location = { autogalaxy: atAutogalaxy, plant: atPlant, company: atCompany };

    addCustomerToSets(customerIds, claim.id, location);
    for (const item of claim.items) {
      if (item.side !== "old") continue;
      addCustomerToSets(customersByTypeSets[asItemType(item.itemType)], claim.id, location);
    }

    if (claim.allocatedStockId) {
      allocatedCustomers.push(customerRow);
      addOldItemQty(outcomes, claim.items, "allocated");
      continue;
    }

    customerPending.push(customerRow);
    addOldItemQty(outcomes, claim.items, "pending");

    for (const item of claim.items) {
      if (item.side !== "old") continue;
      const type = asItemType(item.itemType);
      const qty = item.quantity || 1;
      rows[type].customerPending += qty;
      if (atShowroom) rows[type].autogalaxy += qty;
      if (atPlant) {
        rows[type].plant += qty;
        plantPending.push({
          claimId: claim.id,
          customerName: claim.customerName,
          modelCode: item.modelCode,
          date: claim.sentToCompanyDate ?? claim.receivedDate,
          daysPending: daysBetween(claim.sentToCompanyDate ?? claim.receivedDate, today),
        });
      }
      if (atCompany) {
        rows[type].company += qty;
        companyPending.push({
          claimId: claim.id,
          customerName: claim.customerName,
          modelCode: item.modelCode,
          date: claim.sentToCompanyDate ?? claim.receivedDate,
          daysPending: daysBetween(claim.sentToCompanyDate ?? claim.receivedDate, today),
        });
      }
    }
  }

  for (const item of available) {
    rows[asItemType(item.itemType)].autogalaxy += 1;
  }

  const totals = emptyCounts();
  for (const type of LETTER_ITEM_TYPE_ORDER) {
    rows[type].total = rows[type].customerPending;
    totals.customerPending += rows[type].customerPending;
    totals.autogalaxy += rows[type].autogalaxy;
    totals.plant += rows[type].plant;
    totals.company += rows[type].company;
    totals.total += rows[type].total;
  }

  sortByDateThenName(customerPending);
  sortByDateThenName(allocatedCustomers);
  sortByDateThenName(plantPending);
  sortByDateThenName(companyPending);
  sortByDateThenName(returnedCustomers);

  const customersByType = {
    battery: countsFromSets(customersByTypeSets.battery),
    charger: countsFromSets(customersByTypeSets.charger),
    motor: countsFromSets(customersByTypeSets.motor),
    controller: countsFromSets(customersByTypeSets.controller),
  } as Record<ReplacementItemType, DashboardTypeCounts>;

  return {
    rows,
    totals,
    customersByType,
    customerHeadcount: countsFromSets(customerIds),
    outcomes,
    outcomeTotals: finalizeOutcomes(outcomes),
    plantPending,
    companyPending,
    customerPending,
    allocatedCustomers,
    returnedCustomers,
    availableStock: oldestFirst(available),
  };
}

export function warrantySummaryComment(headcount: DashboardTypeCounts): string {
  const customerWord = headcount.total === 1 ? "customer" : "customers";
  return `${headcount.total} ${customerWord} pending for replacement. Autogalaxy ${headcount.autogalaxy}, Plant ${headcount.plant}, Company ${headcount.company}.`;
}
