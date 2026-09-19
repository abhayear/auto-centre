import type { StaffRole } from "@/lib/admin-roles";
import {
  WARRANTY_ROLES,
  WARRANTY_ROLE_LABELS,
  canViewAllWarrantyCases,
  warrantyRoleForStaffRole,
  type WarrantyRole,
} from "@/lib/warranty-roles";
import {
  normalizeWarrantyTrackingMode,
  usesWarrantyBatch,
  warrantySentTrackingKey,
} from "@/lib/warranty-tracking";

/** Days with the company before follow-up becomes an escalation. */
export const WARRANTY_COMPANY_DELAY_DAYS = 21;
/** Days a customer may wait before the case is escalated. */
export const WARRANTY_CUSTOMER_WAITING_DAYS = 15;
/** Days an allocated component may sit before installation is chased. */
export const WARRANTY_INSTALL_DELAY_DAYS = 3;

export const WARRANTY_STAGES = [
  "ready_to_dispatch",
  "with_company",
  "company_overdue",
  "awaiting_allocation",
  "awaiting_installation",
  "awaiting_verification",
  "closed",
  "cancelled",
] as const;

export type WarrantyStage = (typeof WARRANTY_STAGES)[number];

export const WARRANTY_STAGE_LABELS: Record<WarrantyStage, string> = {
  ready_to_dispatch: "Ready to dispatch",
  with_company: "With company",
  company_overdue: "Overdue with company",
  awaiting_allocation: "Waiting allocation",
  awaiting_installation: "Waiting installation / coding",
  awaiting_verification: "Waiting manager verification",
  closed: "Closed",
  cancelled: "Cancelled",
};

const STAGE_OWNERS: Record<WarrantyStage, WarrantyRole | null> = {
  ready_to_dispatch: "dispatch",
  with_company: "followup",
  company_overdue: "followup",
  awaiting_allocation: "allocation",
  awaiting_installation: "technician",
  awaiting_verification: "warranty_manager",
  closed: null,
  cancelled: null,
};

/**
 * Roles that also need the case in their own list without owning the next step:
 * receiving watches for material coming back, accounts chases the paperwork.
 */
const STAGE_WATCHERS: Record<WarrantyStage, WarrantyRole[]> = {
  ready_to_dispatch: [],
  with_company: ["receiving"],
  company_overdue: ["receiving"],
  awaiting_allocation: ["accounts"],
  awaiting_installation: [],
  awaiting_verification: [],
  closed: [],
  cancelled: [],
};

const STAGE_ACTIONS: Record<WarrantyStage, string> = {
  ready_to_dispatch: "Dispatch to plant / company",
  with_company: "Follow up with company",
  company_overdue: "Escalate company delay",
  awaiting_allocation: "Allocate a component",
  awaiting_installation: "Install and code",
  awaiting_verification: "Verify and close claim",
  closed: "No action",
  cancelled: "No action",
};

export type WarrantyCaseItem = {
  itemType: string;
  side: string;
  modelCode?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  trackingMode?: string | null;
  quantity?: number | null;
};

export type WarrantyCase = {
  id: string;
  caseNumber?: string | null;
  customerName: string;
  status: string;
  destination?: string | null;
  receivedDate: string;
  sentToCompanyDate?: string | null;
  companyInvoiceNumber?: string | null;
  returnedToCustomerDate?: string | null;
  allocatedStockId?: string | null;
  trackingMode?: string | null;
  batchNumber?: string | null;
  bikeId?: string | null;
  bikeNumber?: string | null;
  items: WarrantyCaseItem[];
};

export type WarrantyStockRow = {
  id: string;
  itemType: string;
  modelCode?: string | null;
  serialNumber?: string | null;
  status: string;
  receivedDate: string;
  sourceClaimId?: string | null;
  allocatedClaimId?: string | null;
  allocatedAt?: string | null;
};

export type WarrantyTask = {
  claimId: string;
  caseNumber: string | null;
  customerName: string;
  stage: WarrantyStage;
  stageLabel: string;
  action: string;
  ownerRole: WarrantyRole;
  watcherRoles: WarrantyRole[];
  ageDays: number;
  overdue: boolean;
  detail: string;
};

export const WARRANTY_EXCEPTION_KINDS = [
  "company_delay",
  "customer_waiting",
  "replacement_unavailable",
  "serial_missing",
  "duplicate_serial",
  "duplicate_batch",
  "credit_note_missing",
  "allocated_not_installed",
  "stock_without_claim",
] as const;

export type WarrantyExceptionKind = (typeof WARRANTY_EXCEPTION_KINDS)[number];

export const WARRANTY_EXCEPTION_LABELS: Record<WarrantyExceptionKind, string> = {
  company_delay: "Company delay over limit",
  customer_waiting: "Customer waiting too long",
  replacement_unavailable: "Replacement unavailable",
  serial_missing: "Serial number missing",
  duplicate_serial: "Duplicate claim on one serial",
  duplicate_batch: "Duplicate open claim on one batch",
  credit_note_missing: "Credit note missing",
  allocated_not_installed: "Allocated but not installed",
  stock_without_claim: "Component received with no matching claim",
};

/** What the manager should do. Shown only on Warranty 2.0, never in the staff guide. */
export const WARRANTY_EXCEPTION_ACTIONS: Record<WarrantyExceptionKind, string> = {
  company_delay: "Call the plant today, write their answer on the claim, and chase until a return date is set.",
  customer_waiting: "Call the customer with a date. If a compatible part is free, allocate it now.",
  replacement_unavailable: "Do not promise a date. Arrange stock or a company replacement and keep the claim open.",
  serial_missing: "Read the serial from the part and add a photo. Never guess. If it was sent by batch, switch tracking to batch instead.",
  duplicate_serial: "Cancel the wrong claim with a reason. Keep both records. Do not delete either.",
  duplicate_batch: "Two open claims share one batch. Confirm they are different pieces or cancel the duplicate with a reason.",
  credit_note_missing: "Ask the company for the credit note or bill and attach it the same week.",
  allocated_not_installed: "Call the customer to bring the bike, or fit the part today. Do not give that part to anyone else.",
  stock_without_claim: "Do not issue the part. Find the matching claim first.",
};

export type WarrantyException = {
  kind: WarrantyExceptionKind;
  label: string;
  severity: "high" | "medium";
  claimId: string | null;
  caseNumber: string | null;
  reference: string;
  detail: string;
};

export type WarrantyCounts = {
  openClaims: number;
  readyToDispatch: number;
  withCompany: number;
  overdueWithCompany: number;
  awaitingAllocation: number;
  awaitingInstallation: number;
  awaitingVerification: number;
  customerWaiting: number;
  exceptions: number;
};

export const WARRANTY_PIPELINE_STEPS = [
  "complaint_received",
  "with_company",
  "received_back",
  "waiting_installation",
  "installed_coded",
  "closed",
] as const;

export type WarrantyPipelineStep = (typeof WARRANTY_PIPELINE_STEPS)[number];

export const WARRANTY_PIPELINE_LABELS: Record<WarrantyPipelineStep, string> = {
  complaint_received: "Complaint received",
  with_company: "Sent to company / under repair",
  received_back: "Received back",
  waiting_installation: "Waiting for installation",
  installed_coded: "Installed + coded",
  closed: "Closed",
};

export type WarrantyPipelineStage = {
  step: WarrantyPipelineStep;
  label: string;
  count: number;
};

/** Counts of every physical component we track, not just the ones in a claim. */
export type WarrantyMasterCounts = {
  totalCustomers: number;
  totalBikes: number;
  componentsInWarranty: number;
  warrantyExpiringSoon: number;
};

export type WarrantyBoard = {
  role: WarrantyRole;
  seesAllCases: boolean;
  counts: WarrantyCounts;
  pipeline: WarrantyPipelineStage[];
  masterCounts?: WarrantyMasterCounts;
  myTasks: WarrantyTask[];
  queues: { role: WarrantyRole; label: string; tasks: WarrantyTask[] }[];
  exceptions: WarrantyException[];
};

const CLOSED_STATUSES = new Set(["closed", "cancelled"]);

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function warrantyDaysBetween(from: string, today: string): number {
  const start = parseDateOnly(from).getTime();
  const end = parseDateOnly(today).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function oldItems(claim: WarrantyCase): WarrantyCaseItem[] {
  return claim.items.filter((item) => item.side === "old");
}

function itemTrackingMode(claim: WarrantyCase, item: WarrantyCaseItem) {
  return normalizeWarrantyTrackingMode(item.trackingMode ?? claim.trackingMode);
}

function itemSummary(claim: WarrantyCase): string {
  const first = oldItems(claim)[0];
  if (!first) return "No faulty item recorded";
  const key = warrantySentTrackingKey({
    trackingMode: itemTrackingMode(claim, first),
    serialNumber: first.serialNumber,
    batchNumber: first.batchNumber ?? claim.batchNumber,
  });
  const identifier = key.identifier ? ` ${key.identifier}` : "";
  const model = first.modelCode ? ` ${first.modelCode}` : "";
  return `${first.itemType}${model}${identifier}`.trim();
}

export function warrantyStageFor(claim: WarrantyCase, today: string): WarrantyStage {
  if (claim.status === "cancelled") return "cancelled";
  if (claim.status === "closed") return "closed";

  if (claim.status === "returned_to_customer" || claim.returnedToCustomerDate) {
    return "awaiting_verification";
  }

  if (claim.allocatedStockId) return "awaiting_installation";

  if (claim.status === "sent_to_company") {
    const sent = claim.sentToCompanyDate ?? claim.receivedDate;
    return warrantyDaysBetween(sent, today) > WARRANTY_COMPANY_DELAY_DAYS
      ? "company_overdue"
      : "with_company";
  }

  if (claim.status === "received_from_company") return "awaiting_allocation";

  return "ready_to_dispatch";
}

function stageStartDate(claim: WarrantyCase, stage: WarrantyStage): string {
  if (stage === "with_company" || stage === "company_overdue") {
    return claim.sentToCompanyDate ?? claim.receivedDate;
  }
  if (stage === "awaiting_verification") {
    return claim.returnedToCustomerDate ?? claim.receivedDate;
  }
  return claim.receivedDate;
}

export function warrantyTaskFor(claim: WarrantyCase, today: string): WarrantyTask | null {
  const stage = warrantyStageFor(claim, today);
  const ownerRole = STAGE_OWNERS[stage];
  if (!ownerRole) return null;

  const ageDays = warrantyDaysBetween(stageStartDate(claim, stage), today);
  const customerAge = warrantyDaysBetween(claim.receivedDate, today);

  return {
    claimId: claim.id,
    caseNumber: claim.caseNumber ?? null,
    customerName: claim.customerName,
    stage,
    stageLabel: WARRANTY_STAGE_LABELS[stage],
    action: STAGE_ACTIONS[stage],
    ownerRole,
    watcherRoles: STAGE_WATCHERS[stage],
    ageDays,
    overdue:
      stage === "company_overdue" ||
      (stage === "awaiting_installation" && ageDays > WARRANTY_INSTALL_DELAY_DAYS) ||
      customerAge > WARRANTY_CUSTOMER_WAITING_DAYS,
    detail: itemSummary(claim),
  };
}

export function buildWarrantyTasks(claims: WarrantyCase[], today: string): WarrantyTask[] {
  const tasks: WarrantyTask[] = [];
  for (const claim of claims) {
    const task = warrantyTaskFor(claim, today);
    if (task) tasks.push(task);
  }
  return tasks.sort((left, right) => {
    if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
    if (left.ageDays !== right.ageDays) return right.ageDays - left.ageDays;
    return left.customerName.localeCompare(right.customerName);
  });
}

function isOpen(claim: WarrantyCase): boolean {
  return !CLOSED_STATUSES.has(claim.status);
}

function claimRef(claim: WarrantyCase): string {
  return claim.caseNumber ?? claim.id;
}

export function detectWarrantyExceptions(
  claims: WarrantyCase[],
  stockItems: WarrantyStockRow[],
  today: string,
): WarrantyException[] {
  const exceptions: WarrantyException[] = [];
  const serialOwners = new Map<string, WarrantyCase[]>();
  const batchOwners = new Map<string, WarrantyCase[]>();
  const availableTypes = new Set(
    stockItems.filter((item) => item.status === "available").map((item) => item.itemType),
  );

  for (const claim of claims) {
    if (!isOpen(claim)) continue;

    const stage = warrantyStageFor(claim, today);
    const customerAge = warrantyDaysBetween(claim.receivedDate, today);

    if (stage === "company_overdue") {
      const sent = claim.sentToCompanyDate ?? claim.receivedDate;
      exceptions.push({
        kind: "company_delay",
        label: WARRANTY_EXCEPTION_LABELS.company_delay,
        severity: "high",
        claimId: claim.id,
        caseNumber: claim.caseNumber ?? null,
        reference: claimRef(claim),
        detail: `${claim.destination ?? "Company"} holding ${warrantyDaysBetween(sent, today)} days`,
      });
    }

    if (customerAge > WARRANTY_CUSTOMER_WAITING_DAYS && stage !== "awaiting_verification") {
      exceptions.push({
        kind: "customer_waiting",
        label: WARRANTY_EXCEPTION_LABELS.customer_waiting,
        severity: "high",
        claimId: claim.id,
        caseNumber: claim.caseNumber ?? null,
        reference: claimRef(claim),
        detail: `${claim.customerName} waiting ${customerAge} days`,
      });
    }

    if (stage === "awaiting_allocation") {
      const missing = oldItems(claim).filter((item) => !availableTypes.has(item.itemType));
      if (missing.length > 0) {
        exceptions.push({
          kind: "replacement_unavailable",
          label: WARRANTY_EXCEPTION_LABELS.replacement_unavailable,
          severity: "medium",
          claimId: claim.id,
          caseNumber: claim.caseNumber ?? null,
          reference: claimRef(claim),
          detail: `No available stock for ${missing.map((item) => item.itemType).join(", ")}`,
        });
      }

      if (!claim.companyInvoiceNumber) {
        exceptions.push({
          kind: "credit_note_missing",
          label: WARRANTY_EXCEPTION_LABELS.credit_note_missing,
          severity: "medium",
          claimId: claim.id,
          caseNumber: claim.caseNumber ?? null,
          reference: claimRef(claim),
          detail: "Company received but no credit note or invoice recorded",
        });
      }
    }

    if (stage === "awaiting_installation") {
      const allocatedRow = stockItems.find((item) => item.allocatedClaimId === claim.id);
      const since = allocatedRow?.allocatedAt?.slice(0, 10) ?? claim.receivedDate;
      const waiting = warrantyDaysBetween(since, today);
      if (waiting > WARRANTY_INSTALL_DELAY_DAYS) {
        exceptions.push({
          kind: "allocated_not_installed",
          label: WARRANTY_EXCEPTION_LABELS.allocated_not_installed,
          severity: "medium",
          claimId: claim.id,
          caseNumber: claim.caseNumber ?? null,
          reference: claimRef(claim),
          detail: `Allocated ${waiting} days ago, still not installed`,
        });
      }
    }

    for (const item of oldItems(claim)) {
      const mode = itemTrackingMode(claim, item);
      const serial = (item.serialNumber ?? "").trim().toUpperCase();
      const batch = (item.batchNumber ?? claim.batchNumber ?? "").trim().toUpperCase();

      if (usesWarrantyBatch(mode) && batch) {
        const bikeOrCustomer = (claim.bikeNumber ?? claim.bikeId ?? claim.customerName)
          .trim()
          .toUpperCase();
        const key = `${batch}|${bikeOrCustomer}|${item.itemType}`;
        const owners = batchOwners.get(key) ?? [];
        owners.push(claim);
        batchOwners.set(key, owners);
      }

      if (mode === "batch") {
        continue;
      }

      if (!serial) {
        exceptions.push({
          kind: "serial_missing",
          label: WARRANTY_EXCEPTION_LABELS.serial_missing,
          severity: "medium",
          claimId: claim.id,
          caseNumber: claim.caseNumber ?? null,
          reference: claimRef(claim),
          detail: `${item.itemType} has no serial number`,
        });
        continue;
      }
      const owners = serialOwners.get(serial) ?? [];
      owners.push(claim);
      serialOwners.set(serial, owners);
    }
  }

  for (const [serial, owners] of serialOwners) {
    const unique = new Map(owners.map((claim) => [claim.id, claim]));
    if (unique.size < 2) continue;
    const refs = [...unique.values()].map(claimRef).join(", ");
    exceptions.push({
      kind: "duplicate_serial",
      label: WARRANTY_EXCEPTION_LABELS.duplicate_serial,
      severity: "high",
      claimId: null,
      caseNumber: null,
      reference: serial,
      detail: `Serial ${serial} is open on ${unique.size} claims: ${refs}`,
    });
  }

  for (const [key, owners] of batchOwners) {
    const unique = new Map(owners.map((claim) => [claim.id, claim]));
    if (unique.size < 2) continue;
    const [batch] = key.split("|");
    const refs = [...unique.values()].map(claimRef).join(", ");
    exceptions.push({
      kind: "duplicate_batch",
      label: WARRANTY_EXCEPTION_LABELS.duplicate_batch,
      severity: "high",
      claimId: null,
      caseNumber: null,
      reference: batch,
      detail: `Batch ${batch} is open on ${unique.size} claims for the same customer and part: ${refs}`,
    });
  }

  for (const item of stockItems) {
    if (item.status !== "available" || item.sourceClaimId) continue;
    exceptions.push({
      kind: "stock_without_claim",
      label: WARRANTY_EXCEPTION_LABELS.stock_without_claim,
      severity: "medium",
      claimId: null,
      caseNumber: null,
      reference: item.serialNumber ?? item.modelCode ?? item.id,
      detail: `${item.itemType} received ${item.receivedDate} with no source claim`,
    });
  }

  return exceptions.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "high" ? -1 : 1;
    return left.reference.localeCompare(right.reference);
  });
}

export function countWarrantyBoard(
  claims: WarrantyCase[],
  tasks: WarrantyTask[],
  exceptions: WarrantyException[],
  today: string,
): WarrantyCounts {
  const byStage = (stage: WarrantyStage) => tasks.filter((task) => task.stage === stage).length;

  return {
    openClaims: claims.filter(isOpen).length,
    readyToDispatch: byStage("ready_to_dispatch"),
    withCompany: byStage("with_company") + byStage("company_overdue"),
    overdueWithCompany: byStage("company_overdue"),
    awaitingAllocation: byStage("awaiting_allocation"),
    awaitingInstallation: byStage("awaiting_installation"),
    awaitingVerification: byStage("awaiting_verification"),
    customerWaiting: claims.filter(
      (claim) =>
        isOpen(claim) &&
        warrantyStageFor(claim, today) !== "awaiting_verification" &&
        warrantyDaysBetween(claim.receivedDate, today) > WARRANTY_CUSTOMER_WAITING_DAYS,
    ).length,
    exceptions: exceptions.length,
  };
}

const PIPELINE_STAGES: Record<WarrantyPipelineStep, WarrantyStage[]> = {
  complaint_received: ["ready_to_dispatch"],
  with_company: ["with_company", "company_overdue"],
  received_back: ["awaiting_allocation"],
  waiting_installation: ["awaiting_installation"],
  installed_coded: ["awaiting_verification"],
  closed: ["closed"],
};

/** The dealer's mental model: one strip from complaint to closed. */
export function buildWarrantyPipeline(
  claims: WarrantyCase[],
  today: string,
): WarrantyPipelineStage[] {
  const stages = claims.map((claim) => warrantyStageFor(claim, today));

  return WARRANTY_PIPELINE_STEPS.map((step) => ({
    step,
    label: WARRANTY_PIPELINE_LABELS[step],
    count: stages.filter((stage) => PIPELINE_STAGES[step].includes(stage)).length,
  }));
}

export function buildWarrantyBoard(
  role: WarrantyRole,
  claims: WarrantyCase[],
  stockItems: WarrantyStockRow[],
  today: string,
): WarrantyBoard {
  const tasks = buildWarrantyTasks(claims, today);
  const exceptions = detectWarrantyExceptions(claims, stockItems, today);
  const seesAllCases = canViewAllWarrantyCases(role);

  const queues = seesAllCases
    ? WARRANTY_ROLES.map((queueRole) => ({
        role: queueRole,
        label: WARRANTY_ROLE_LABELS[queueRole],
        tasks: warrantyTasksForRole(tasks, queueRole),
      })).filter((queue) => queue.tasks.length > 0)
    : [];

  return {
    role,
    seesAllCases,
    counts: countWarrantyBoard(claims, tasks, exceptions, today),
    pipeline: buildWarrantyPipeline(claims, today),
    myTasks: warrantyTasksForRole(tasks, role),
    queues,
    exceptions: seesAllCases ? exceptions : [],
  };
}

export function warrantyTasksForRole(tasks: WarrantyTask[], role: WarrantyRole): WarrantyTask[] {
  return tasks.filter(
    (task) => task.ownerRole === role || task.watcherRoles.includes(role),
  );
}

export function warrantyRoleHasQueue(role: WarrantyRole): boolean {
  return WARRANTY_STAGES.some(
    (stage) => STAGE_OWNERS[stage] === role || STAGE_WATCHERS[stage].includes(role),
  );
}

/** A staff member gets the board when they supervise it or own a queue in it. */
export function canUseWarrantyBoard(staffRole: StaffRole): boolean {
  const role = warrantyRoleForStaffRole(staffRole);
  if (!role) return false;
  return canViewAllWarrantyCases(role) || warrantyRoleHasQueue(role);
}