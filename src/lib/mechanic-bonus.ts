export const MECHANIC_BONUS_SCALE = [1, 2, 3, 4, 5] as const;
export type MechanicBonusScore = (typeof MECHANIC_BONUS_SCALE)[number];

export type MechanicBonusRosterInput = {
  names: string[];
};

export type MechanicBonusRatingInput = {
  billNo: string;
  mechanicName: string;
  rating: number;
};

export function isMechanicBonusScore(value: number): value is MechanicBonusScore {
  return MECHANIC_BONUS_SCALE.includes(value as MechanicBonusScore);
}

export function mechanicNames(roster: MechanicBonusRosterInput): string[] {
  return roster.names.map((name) => name.trim()).filter((name) => name.length >= 1);
}

export function rosterIsReady(roster: MechanicBonusRosterInput): boolean {
  return mechanicNames(roster).length >= 1;
}

export function isRosterMechanic(roster: MechanicBonusRosterInput, mechanicName: string): boolean {
  const wanted = mechanicName.trim().toLowerCase();
  return mechanicNames(roster).some((name) => name.toLowerCase() === wanted);
}

export function rosterFromFormData(form: FormData): MechanicBonusRosterInput {
  return {
    names: form
      .getAll("mechanicName")
      .map((value) => String(value).trim())
      .filter((name) => name.length >= 1),
  };
}

export function bonusAverage(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((sum, score) => sum + score, 0) / ratings.length) * 10) / 10;
}
