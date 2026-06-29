export const ADMIN_ROLE = "admin" as const;
export const MANAGER_ROLE = "manager" as const;

export type StaffRole = typeof ADMIN_ROLE | typeof MANAGER_ROLE;

export function isAdminRole(role: string): role is typeof ADMIN_ROLE {
  return role === ADMIN_ROLE;
}

export function isManagerRole(role: string): role is typeof MANAGER_ROLE {
  return role === MANAGER_ROLE;
}
