export const MECHANIC_BONUS_SCALE = [1, 2, 3, 4, 5] as const;
export type MechanicBonusScore = (typeof MECHANIC_BONUS_SCALE)[number];

export type MechanicBonusRosterInput = {
  names: string[];
  photoUrls?: (string | null)[];
};

export type MechanicRosterMember = {
  name: string;
  photoUrl: string | null;
};

export type MechanicBonusRatingInput = {
  billNo: string;
  mechanicName: string;
  rating: number;
};

export const DUPLICATE_BILL_RATING_ERROR = "This bill number already has a rating.";

export function normalizeBillNo(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002",
  );
}

export function isMechanicBonusScore(value: number): value is MechanicBonusScore {
  return MECHANIC_BONUS_SCALE.includes(value as MechanicBonusScore);
}

export function mechanicMembers(roster: MechanicBonusRosterInput): MechanicRosterMember[] {
  const photos = roster.photoUrls ?? [];
  return roster.names
    .map((name, index) => {
      const photo = photos[index]?.trim() || null;
      return { name: name.trim(), photoUrl: photo };
    })
    .filter((member) => member.name.length >= 1);
}

export function mechanicNames(roster: MechanicBonusRosterInput): string[] {
  return mechanicMembers(roster).map((member) => member.name);
}

export function rosterIsReady(roster: MechanicBonusRosterInput): boolean {
  return mechanicNames(roster).length >= 1;
}

export function isRosterMechanic(roster: MechanicBonusRosterInput, mechanicName: string): boolean {
  const wanted = mechanicName.trim().toLowerCase();
  return mechanicNames(roster).some((name) => name.toLowerCase() === wanted);
}

export function rosterFromFormData(form: FormData): MechanicBonusRosterInput {
  const names = form.getAll("mechanicName").map((value) => String(value));
  const photos = form.getAll("mechanicPhoto").map((value) => String(value));
  const nextNames: string[] = [];
  const photoUrls: (string | null)[] = [];

  names.forEach((rawName, index) => {
    const name = rawName.trim();
    if (name.length < 1) return;
    nextNames.push(name);
    const photo = (photos[index] ?? "").trim();
    photoUrls.push(photo.length > 0 ? photo : null);
  });

  return { names: nextNames, photoUrls };
}

export function bonusAverage(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((sum, score) => sum + score, 0) / ratings.length) * 10) / 10;
}
