export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "interviewed",
  "rejected",
  "hired",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Application received",
  reviewing: "Under review",
  interviewed: "Interview stage",
  rejected: "Not selected",
  hired: "Offer accepted",
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AG-${suffix}`;
}

export function formatStatusLabel(status: string): string {
  if (isApplicationStatus(status)) {
    return APPLICATION_STATUS_LABELS[status];
  }
  return status;
}

export function statusChangeMessage(from: string, to: string): string {
  return `Status updated from ${formatStatusLabel(from)} to ${formatStatusLabel(to)}`;
}
