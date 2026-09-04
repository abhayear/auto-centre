import {
  canAssignWork,
  canEditTraining,
  canUseOpsPortal,
  canViewReleases,
  isAdminRole,
  trainingAudienceForRole,
  type StaffRole,
} from "@/lib/admin-roles";

export function homeRedirectForRole(role: StaffRole): string | null {
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
    return isAdminRole(role) ? null : fallbackRedirectForRole(role);
  }

  return canUseOpsPortal(role) ? null : fallbackRedirectForRole(role);
}
