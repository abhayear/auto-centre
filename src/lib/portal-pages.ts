import {
  canAppointStaff,
  canAssignWork,
  canEditTraining,
  canUseOpsPortal,
  canViewReleases,
  trainingAudienceForRole,
  type StaffRole,
} from "@/lib/admin-roles";
import {
  canAuditInventory,
  canIssueInventory,
  canManageBuyingPortals,
  canReceiveInventory,
  canUseCourierTransport,
  inventoryHomeForRole,
} from "@/lib/inventory-access";
import { canUseWarrantyBoard } from "@/lib/warranty-workflow";

export function homeRedirectForRole(role: StaffRole): string | null {
  const inventoryHome = inventoryHomeForRole(role);
  if (inventoryHome) return inventoryHome;
  if (canUseOpsPortal(role)) return null;
  if (role === "senior_developer") return "/admin/releases";
  if (role === "junior_developer") return "/admin/work";
  return "/admin/training";
}

function isPage(pathname: string, page: string): boolean {
  return pathname === page || pathname.startsWith(`${page}/`);
}

function fallbackRedirectForRole(role: StaffRole): string {
  return homeRedirectForRole(role) ?? "/admin";
}

export function assertStaffPageAccess(
  pathname: string | null | undefined,
  role: StaffRole,
): string | null {
  if (!pathname) {
    return canUseOpsPortal(role) ? null : fallbackRedirectForRole(role);
  }

  if (pathname === "/admin") return null;

  if (isPage(pathname, "/admin/change-password")) return null;

  // Must be checked before the board, which matches this path as a prefix.
  if (isPage(pathname, "/admin/warranty/handbook")) {
    return canUseOpsPortal(role) ? null : fallbackRedirectForRole(role);
  }

  // Covers the board itself, which stays open to every queue owner.
  if (isPage(pathname, "/admin/warranty")) {
    return canUseWarrantyBoard(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/inventory/portals")) {
    return canManageBuyingPortals(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/inventory/couriers")) {
    return canUseCourierTransport(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/inventory/receive")) {
    return canReceiveInventory(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/inventory/issue")) {
    return canIssueInventory(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/inventory/audit")) {
    return canAuditInventory(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/training")) {
    const canAccessTraining =
      canEditTraining(role) || trainingAudienceForRole(role) !== null;
    return canAccessTraining ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/work")) {
    const canAccessWork =
      canAssignWork(role) || role === "junior_developer";
    return canAccessWork ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/releases")) {
    return canViewReleases(role) ? null : fallbackRedirectForRole(role);
  }

  if (isPage(pathname, "/admin/staff")) {
    return canAppointStaff(role) ? null : fallbackRedirectForRole(role);
  }

  return canUseOpsPortal(role) ? null : fallbackRedirectForRole(role);
}
