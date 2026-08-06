export type ElectricScooterMilestone = {
  id: string;
  label: string;
  shortLabel: string;
  days: number;
  type: "free" | "paid";
};

/** Electric scooter Li-ion / VRLA — paid & free service intervals from OEM annexure (days from delivery). */
export const ELECTRIC_SCOOTER_MILESTONES: ElectricScooterMilestone[] = [
  { id: "1st-fs", label: "1st FS — Free Service", shortLabel: "1st FS", days: 60, type: "free" },
  { id: "2nd-fs", label: "2nd FS — Free Service", shortLabel: "2nd FS", days: 180, type: "free" },
  { id: "3rd-fs", label: "3rd FS — Free Service", shortLabel: "3rd FS", days: 270, type: "free" },
  { id: "4th-fs", label: "4th FS — Free Service", shortLabel: "4th FS", days: 360, type: "free" },
  { id: "5th-ps", label: "5th PS — Paid Service", shortLabel: "5th PS", days: 480, type: "paid" },
  { id: "6th-ps", label: "6th PS — Paid Service", shortLabel: "6th PS", days: 600, type: "paid" },
  { id: "7th-ps", label: "7th PS — Paid Service", shortLabel: "7th PS", days: 720, type: "paid" },
  { id: "8th-ps", label: "8th PS — Paid Service", shortLabel: "8th PS", days: 840, type: "paid" },
  { id: "9th-ps", label: "9th PS — Paid Service", shortLabel: "9th PS", days: 960, type: "paid" },
  { id: "10th-ps", label: "10th PS — Paid Service", shortLabel: "10th PS", days: 1080, type: "paid" },
];

export const LAST_OEM_MILESTONE_ID = "10th-ps";
export const PAID_SERVICE_INTERVAL_DAYS = 120;
export const OEM_SCHEDULE_DAYS = ELECTRIC_SCOOTER_MILESTONES.at(-1)?.days ?? 1080;
export const ANNUAL_SERVICE_INTERVAL_DAYS = 365;

export const SERVICE_ACTION_CODES = [
  { code: "A", meaning: "Adjust" },
  { code: "C", meaning: "Clean" },
  { code: "R", meaning: "Replace" },
  { code: "L", meaning: "Lubricate" },
  { code: "I", meaning: "Inspect, correct & replace if required" },
  { code: "T", meaning: "Tighten to specified torque" },
  { code: "CDC", meaning: "Charge, Discharge & Charge" },
  { code: "TR", meaning: "Tyre rotate" },
] as const;

export type MilestoneStatus = "overdue" | "due-soon" | "upcoming" | "completed";

export type MilestoneDue = ElectricScooterMilestone & {
  dueDate: Date;
  status: MilestoneStatus;
  daysUntilDue: number;
};

export type AnnualServiceDue = {
  id: string;
  label: string;
  shortLabel: string;
  yearNumber: number;
  dueDate: Date;
  status: MilestoneStatus;
  daysUntilDue: number;
  type: "annual";
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseDeliveryDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function statusFromDaysUntilDue(daysUntilDue: number): MilestoneStatus {
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 14) return "due-soon";
  return "upcoming";
}

export function getNinthPsDueDate(deliveryDate: Date): Date {
  return addDays(startOfDayUtc(deliveryDate), OEM_SCHEDULE_DAYS);
}

export function isOemScheduleComplete(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
): boolean {
  if (lastCompletedMilestoneId === LAST_OEM_MILESTONE_ID) return true;
  return startOfDayUtc(today) >= getNinthPsDueDate(deliveryDate);
}

function buildAnnualServiceDue(
  yearNumber: number,
  dueDate: Date,
  today: Date,
): AnnualServiceDue {
  const daysUntilDue = daysBetween(startOfDayUtc(today), dueDate);
  return {
    id: `annual-${yearNumber}`,
    label: `Annual maintenance — Year ${yearNumber}`,
    shortLabel: `Annual ${yearNumber}`,
    yearNumber,
    dueDate,
    status: statusFromDaysUntilDue(daysUntilDue),
    daysUntilDue,
    type: "annual",
  };
}

export function getAnnualServiceReminders(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
  count = 3,
): AnnualServiceDue[] {
  if (!isOemScheduleComplete(deliveryDate, today, lastCompletedMilestoneId)) {
    return [];
  }

  const ninthPsDue = getNinthPsDueDate(deliveryDate);
  const now = startOfDayUtc(today);
  let yearNumber = 1;
  let dueDate = addDays(ninthPsDue, ANNUAL_SERVICE_INTERVAL_DAYS);

  while (yearNumber < 100) {
    const nextDueDate = addDays(ninthPsDue, ANNUAL_SERVICE_INTERVAL_DAYS * (yearNumber + 1));
    if (now >= dueDate && now >= nextDueDate) {
      yearNumber += 1;
      dueDate = nextDueDate;
    } else {
      break;
    }
  }

  const reminders: AnnualServiceDue[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const annualYear = yearNumber + offset;
    reminders.push(
      buildAnnualServiceDue(
        annualYear,
        addDays(ninthPsDue, ANNUAL_SERVICE_INTERVAL_DAYS * annualYear),
        today,
      ),
    );
  }

  return reminders;
}

export function getNextAnnualServiceReminder(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
): AnnualServiceDue | null {
  return getAnnualServiceReminders(deliveryDate, today, lastCompletedMilestoneId, 1)[0] ?? null;
}

export function getMilestoneDueDates(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
): MilestoneDue[] {
  const delivery = startOfDayUtc(deliveryDate);
  const now = startOfDayUtc(today);
  const completedIndex = lastCompletedMilestoneId
    ? ELECTRIC_SCOOTER_MILESTONES.findIndex((m) => m.id === lastCompletedMilestoneId)
    : -1;

  return ELECTRIC_SCOOTER_MILESTONES.map((milestone, index) => {
    const dueDate = addDays(delivery, milestone.days);
    const daysUntilDue = daysBetween(now, dueDate);

    let status: MilestoneStatus;
    if (index <= completedIndex) {
      status = "completed";
    } else {
      status = statusFromDaysUntilDue(daysUntilDue);
    }

    return { ...milestone, dueDate, status, daysUntilDue };
  });
}

export function getNextDueMilestone(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
): MilestoneDue | null {
  if (isOemScheduleComplete(deliveryDate, today, lastCompletedMilestoneId)) {
    return null;
  }

  const milestones = getMilestoneDueDates(deliveryDate, today, lastCompletedMilestoneId);
  return milestones.find((m) => m.status !== "completed") ?? null;
}

export function getNextServiceDue(
  deliveryDate: Date,
  today: Date = new Date(),
  lastCompletedMilestoneId?: string,
): MilestoneDue | AnnualServiceDue | null {
  return (
    getNextDueMilestone(deliveryDate, today, lastCompletedMilestoneId) ??
    getNextAnnualServiceReminder(deliveryDate, today, lastCompletedMilestoneId)
  );
}

export function formatScheduleDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
