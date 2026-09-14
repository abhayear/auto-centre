export const MECHANIC_BONUS_SCALE = [1, 2, 3, 4, 5] as const;
export type MechanicBonusScore = (typeof MECHANIC_BONUS_SCALE)[number];

export type MechanicBonusRosterInput = {
  mechanic1Name: string;
  mechanic2Name: string;
  mechanic3Name: string;
};

export type MechanicBonusRatingInput = {
  billNo: string;
  mechanic1Rating: number;
  mechanic2Rating: number;
  mechanic3Rating: number;
};

export function isMechanicBonusScore(value: number): value is MechanicBonusScore {
  return MECHANIC_BONUS_SCALE.includes(value as MechanicBonusScore);
}

export function mechanicNames(roster: MechanicBonusRosterInput): [string, string, string] {
  return [roster.mechanic1Name.trim(), roster.mechanic2Name.trim(), roster.mechanic3Name.trim()];
}

export function rosterIsReady(roster: MechanicBonusRosterInput): boolean {
  return mechanicNames(roster).every((name) => name.length >= 2);
}

export function bonusAverage(ratings: [number, number, number]): number {
  return Math.round(((ratings[0] + ratings[1] + ratings[2]) / 3) * 10) / 10;
}
