import { canUseOpsPortal, isStaffRole, type StaffRole } from "./admin-roles";

/** Pure guard for ops portal access — exported for unit tests. */
export function assertOpsRole(role: string | undefined): role is StaffRole {
  return !!role && isStaffRole(role) && canUseOpsPortal(role);
}
