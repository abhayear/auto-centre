import { URGENT_WARRANTY_MONTHS, codesMatch } from "@/lib/warranty-allocation";
import { normalizeComponentType } from "@/lib/component-warranty";

/** Distance is a preference, so these are the tie-breaker limits, not filters. */
export const NEARBY_KM = 10;
export const WAITING_ESCALATION_DAYS = 21;

export const WARRANTY_PRIORITY_TIERS = [
  "urgent_warranty",
  "waiting_long",
  "nearby",
  "standard",
] as const;

export type WarrantyPriorityTier = (typeof WARRANTY_PRIORITY_TIERS)[number];

export const WARRANTY_PRIORITY_TIER_LABELS: Record<WarrantyPriorityTier, string> = {
  urgent_warranty: "Urgent warranty",
  waiting_long: "Waiting longer",
  nearby: "Nearby",
  standard: "Standard",
};

export type AvailableComponent = {
  id: string;
  serialNumber: string;
  componentType: string;
  modelCode?: string | null;
  ah?: number | null;
  voltage?: string | null;
};

export type AllocationCandidate = {
  claimId: string;
  caseNumber?: string | null;
  customerName: string;
  bikeNumber?: string | null;
  componentType: string;
  modelCode?: string | null;
  ah?: number | null;
  voltage?: string | null;
  waitingSince: string;
  distanceKm?: number | null;
  remainingWarrantyMonths?: number | null;
};

export type RankedCandidate = AllocationCandidate & {
  tier: WarrantyPriorityTier;
  tierLabel: string;
  waitingDays: number;
  exactModelMatch: boolean;
};

export type AllocationPriorityOptions = {
  nearbyKm?: number;
  escalationDays?: number;
  urgentMonths?: number;
};

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function waitingDaysFor(waitingSince: string, today: string): number {
  const start = parseDateOnly(waitingSince).getTime();
  const end = parseDateOnly(today).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Availability is compulsory: the type must match, and any recorded AH or
 * voltage on both sides must agree. An exact model code is preferred later,
 * not required here.
 */
export function isCompatibleWithComponent(
  candidate: Pick<AllocationCandidate, "componentType" | "ah" | "voltage">,
  component: AvailableComponent,
): boolean {
  if (normalizeComponentType(candidate.componentType) !== normalizeComponentType(component.componentType)) {
    return false;
  }
  if (candidate.ah != null && component.ah != null && candidate.ah !== component.ah) {
    return false;
  }
  if (candidate.voltage && component.voltage && candidate.voltage !== component.voltage) {
    return false;
  }
  return true;
}

export function priorityTierFor(
  candidate: AllocationCandidate,
  waitingDays: number,
  options: AllocationPriorityOptions = {},
): WarrantyPriorityTier {
  const nearbyKm = options.nearbyKm ?? NEARBY_KM;
  const escalationDays = options.escalationDays ?? WAITING_ESCALATION_DAYS;
  const urgentMonths = options.urgentMonths ?? URGENT_WARRANTY_MONTHS;

  if (
    candidate.remainingWarrantyMonths != null &&
    candidate.remainingWarrantyMonths <= urgentMonths
  ) {
    return "urgent_warranty";
  }
  if (waitingDays > escalationDays) return "waiting_long";
  if (candidate.distanceKm != null && candidate.distanceKm <= nearbyKm) return "nearby";
  return "standard";
}

/**
 * Who should get this component. Nearby customers are preferred, but a
 * customer who has already waited past the escalation limit is never overtaken
 * by a closer one who just arrived.
 */
export function rankAllocationCandidates(
  component: AvailableComponent,
  candidates: AllocationCandidate[],
  today: string,
  options: AllocationPriorityOptions = {},
): RankedCandidate[] {
  const ranked = candidates
    .filter((candidate) => isCompatibleWithComponent(candidate, component))
    .map((candidate) => {
      const waitingDays = waitingDaysFor(candidate.waitingSince, today);
      const tier = priorityTierFor(candidate, waitingDays, options);
      return {
        ...candidate,
        tier,
        tierLabel: WARRANTY_PRIORITY_TIER_LABELS[tier],
        waitingDays,
        exactModelMatch: codesMatch(candidate.modelCode, component.modelCode),
      };
    });

  return ranked.sort((left, right) => {
    const byTier =
      WARRANTY_PRIORITY_TIERS.indexOf(left.tier) - WARRANTY_PRIORITY_TIERS.indexOf(right.tier);
    if (byTier !== 0) return byTier;
    if (left.exactModelMatch !== right.exactModelMatch) return left.exactModelMatch ? -1 : 1;
    if (left.waitingDays !== right.waitingDays) return right.waitingDays - left.waitingDays;
    const leftKm = left.distanceKm ?? Number.POSITIVE_INFINITY;
    const rightKm = right.distanceKm ?? Number.POSITIVE_INFINITY;
    if (leftKm !== rightKm) return leftKm - rightKm;
    return left.customerName.localeCompare(right.customerName);
  });
}

export function recommendedCandidate(
  component: AvailableComponent,
  candidates: AllocationCandidate[],
  today: string,
  options: AllocationPriorityOptions = {},
): RankedCandidate | null {
  return rankAllocationCandidates(component, candidates, today, options)[0] ?? null;
}
