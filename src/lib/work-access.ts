import { canAssignWork, type StaffRole } from "@/lib/admin-roles";

export function canViewWorkItem(
  role: StaffRole,
  userId: string,
  item: { assigneeId: string | null; createdById: string },
): boolean {
  if (canAssignWork(role)) return true;
  return item.assigneeId === userId;
}

export function canPatchWorkItem(
  role: StaffRole,
  userId: string,
  item: { assigneeId: string | null },
  patch: { status?: string; assigneeId?: string | null; title?: string },
): boolean {
  if (canAssignWork(role)) return true;
  if (item.assigneeId !== userId) return false;
  const keys = Object.keys(patch);
  return keys.every((key) => key === "status");
}
