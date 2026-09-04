import {
  canEditTraining,
  canReadTraining,
  type StaffRole,
  type TrainingAudience,
} from "@/lib/admin-roles";

export const TRAINING_KINDS = ["script", "sop", "video", "file"] as const;
export const TRAINING_AUDIENCES = ["sales", "mechanic", "manager"] as const;

export function visibleTrainingRows(
  role: StaffRole,
  rows: { audience: string; published: boolean }[],
) {
  if (canEditTraining(role)) return rows;
  return rows.filter(
    (row) =>
      row.published &&
      canReadTraining(role, row.audience as TrainingAudience),
  );
}
