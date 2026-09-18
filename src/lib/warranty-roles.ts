import {
  ADMIN_ROLE,
  MANAGER_ROLE,
  MECHANIC_ROLE,
  PURCHASING_ROLE,
  SALES_ROLE,
  STORE_ROLE,
  type StaffRole,
} from "@/lib/admin-roles";

export const WARRANTY_ROLES = [
  "owner",
  "warranty_manager",
  "intake",
  "dispatch",
  "followup",
  "receiving",
  "allocation",
  "technician",
  "accounts",
  "support",
  "auditor",
] as const;

export type WarrantyRole = (typeof WARRANTY_ROLES)[number];

export const WARRANTY_ROLE_LABELS: Record<WarrantyRole, string> = {
  owner: "Owner / Super Admin",
  warranty_manager: "Warranty Manager",
  intake: "Warranty Intake Executive",
  dispatch: "Dispatch Executive",
  followup: "Company Follow-up Executive",
  receiving: "Receiving & Inventory Executive",
  allocation: "Allocation Executive",
  technician: "Technician / Coding Executive",
  accounts: "Accounts / Documentation Executive",
  support: "Customer Support",
  auditor: "Auditor / Management Viewer",
};

/** Level 1 view, 2 create, 3 process, 4 approve, 5 admin. */
export const WARRANTY_LEVELS = [1, 2, 3, 4, 5] as const;
export type WarrantyLevel = (typeof WARRANTY_LEVELS)[number];

export const WARRANTY_LEVEL_LABELS: Record<WarrantyLevel, string> = {
  1: "View",
  2: "Create",
  3: "Process",
  4: "Approve",
  5: "Admin",
};

const ROLE_LEVELS: Record<WarrantyRole, WarrantyLevel> = {
  owner: 5,
  warranty_manager: 4,
  intake: 2,
  dispatch: 3,
  followup: 3,
  receiving: 3,
  allocation: 3,
  technician: 3,
  accounts: 3,
  support: 2,
  auditor: 1,
};

export const WARRANTY_ACTIONS = [
  "create_claim",
  "approve_claim",
  "dispatch",
  "follow_up",
  "receive",
  "allocate",
  "install_code",
  "close_claim",
  "upload_documents",
  "resolve_exceptions",
  "correct_records",
  "view_all_data",
  "change_warranty_period",
  "manage_users",
] as const;

export type WarrantyAction = (typeof WARRANTY_ACTIONS)[number];

export const WARRANTY_ACTION_LABELS: Record<WarrantyAction, string> = {
  create_claim: "Create claim",
  approve_claim: "Approve claim",
  dispatch: "Dispatch",
  follow_up: "Follow up with company",
  receive: "Receive",
  allocate: "Allocate",
  install_code: "Install / code",
  close_claim: "Close claim",
  upload_documents: "Upload documents",
  resolve_exceptions: "Resolve exceptions",
  correct_records: "Correct / reverse records",
  view_all_data: "See all data",
  change_warranty_period: "Change warranty period",
  manage_users: "Change users",
};

const OWNER_ONLY_ACTIONS: WarrantyAction[] = ["change_warranty_period", "manage_users"];

const ROLE_ACTIONS: Record<WarrantyRole, WarrantyAction[]> = {
  owner: [...WARRANTY_ACTIONS],
  warranty_manager: [
    "create_claim",
    "approve_claim",
    "dispatch",
    "follow_up",
    "receive",
    "allocate",
    "install_code",
    "close_claim",
    "upload_documents",
    "resolve_exceptions",
    "correct_records",
    "view_all_data",
  ],
  intake: ["create_claim"],
  dispatch: ["dispatch"],
  followup: ["follow_up"],
  receiving: ["receive"],
  allocation: ["allocate"],
  technician: ["install_code"],
  accounts: ["upload_documents"],
  support: [],
  auditor: [],
};

/**
 * Records are never deleted. Employees cancel, correct, or reverse with a
 * mandatory reason so the owner keeps a complete audit trail.
 */
export const WARRANTY_REASON_REQUIRED_ACTIONS: WarrantyAction[] = [
  "approve_claim",
  "close_claim",
  "correct_records",
];

export function isWarrantyRole(value: string): value is WarrantyRole {
  return (WARRANTY_ROLES as readonly string[]).includes(value);
}

export function warrantyLevel(role: WarrantyRole): WarrantyLevel {
  return ROLE_LEVELS[role];
}

export function canWarrantyAction(role: WarrantyRole, action: WarrantyAction): boolean {
  return ROLE_ACTIONS[role].includes(action);
}

export function warrantyActionsFor(role: WarrantyRole): WarrantyAction[] {
  return [...ROLE_ACTIONS[role]];
}

export function requiresWarrantyReason(action: WarrantyAction): boolean {
  return WARRANTY_REASON_REQUIRED_ACTIONS.includes(action);
}

export function isOwnerOnlyAction(action: WarrantyAction): boolean {
  return OWNER_ONLY_ACTIONS.includes(action);
}

/** Supervisors see every case; everyone else only sees their own queue. */
export function canViewAllWarrantyCases(role: WarrantyRole): boolean {
  return canWarrantyAction(role, "view_all_data") || role === "auditor";
}

export function isWarrantyReadOnly(role: WarrantyRole): boolean {
  return warrantyLevel(role) === 1;
}

const STAFF_ROLE_TO_WARRANTY_ROLE: Partial<Record<StaffRole, WarrantyRole>> = {
  [ADMIN_ROLE]: "owner",
  [MANAGER_ROLE]: "warranty_manager",
  [PURCHASING_ROLE]: "dispatch",
  [STORE_ROLE]: "receiving",
  [MECHANIC_ROLE]: "technician",
  [SALES_ROLE]: "support",
};

export function warrantyRoleForStaffRole(role: StaffRole): WarrantyRole | null {
  return STAFF_ROLE_TO_WARRANTY_ROLE[role] ?? null;
}
