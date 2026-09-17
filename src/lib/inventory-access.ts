import {
  ADMIN_ROLE,
  MANAGER_ROLE,
  PURCHASING_ROLE,
  STORE_ROLE,
  type StaffRole,
} from "@/lib/admin-roles";

export function canManageBuyingPortals(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === MANAGER_ROLE;
}

export function canWriteInventoryRates(role: StaffRole): boolean {
  return canManageBuyingPortals(role);
}

export function canReceiveInventory(role: StaffRole): boolean {
  return canManageBuyingPortals(role) || role === PURCHASING_ROLE;
}

export function canIssueInventory(role: StaffRole): boolean {
  return canManageBuyingPortals(role) || role === STORE_ROLE;
}

export function canAuditInventory(role: StaffRole): boolean {
  return canIssueInventory(role);
}

export function canListBuyingPortals(role: StaffRole): boolean {
  return canManageBuyingPortals(role) || canReceiveInventory(role) || canIssueInventory(role);
}

export function canUseCourierTransport(role: StaffRole): boolean {
  return canListBuyingPortals(role);
}

export function inventoryHomeForRole(role: StaffRole): string | null {
  if (role === PURCHASING_ROLE) return "/admin/inventory/receive";
  if (role === STORE_ROLE) return "/admin/inventory/issue";
  return null;
}
