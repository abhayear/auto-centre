export const ADMIN_ROLE = "admin" as const;
export const MANAGER_ROLE = "manager" as const;
export const SENIOR_DEVELOPER_ROLE = "senior_developer" as const;
export const JUNIOR_DEVELOPER_ROLE = "junior_developer" as const;
export const SALES_ROLE = "sales" as const;
export const MECHANIC_ROLE = "mechanic" as const;

export const STAFF_ROLES = [
  ADMIN_ROLE,
  MANAGER_ROLE,
  SENIOR_DEVELOPER_ROLE,
  JUNIOR_DEVELOPER_ROLE,
  SALES_ROLE,
  MECHANIC_ROLE,
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type TrainingAudience = "sales" | "mechanic" | "manager";

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string): role is typeof ADMIN_ROLE {
  return role === ADMIN_ROLE;
}

export function isManagerRole(role: string): role is typeof MANAGER_ROLE {
  return role === MANAGER_ROLE;
}

export function canEditCashBox(role: StaffRole): boolean {
  return role === ADMIN_ROLE;
}

export function canEditTraining(role: StaffRole): boolean {
  return role === ADMIN_ROLE;
}

export function canReadTraining(role: StaffRole, audience: TrainingAudience): boolean {
  if (role === ADMIN_ROLE) return true;
  return trainingAudienceForRole(role) === audience;
}

export function canAssignWork(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === SENIOR_DEVELOPER_ROLE;
}

export function canMergeReleases(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === SENIOR_DEVELOPER_ROLE;
}

export function canUseOpsPortal(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === MANAGER_ROLE;
}

export function canViewReleases(role: StaffRole): boolean {
  return (
    role === ADMIN_ROLE ||
    role === SENIOR_DEVELOPER_ROLE ||
    role === JUNIOR_DEVELOPER_ROLE
  );
}

export function trainingAudienceForRole(role: StaffRole): TrainingAudience | null {
  if (role === SALES_ROLE || role === MECHANIC_ROLE || role === MANAGER_ROLE) {
    return role;
  }
  return null;
}
