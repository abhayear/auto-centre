export const MECHANIC_BONUS_SCALE = [1, 2, 3, 4, 5] as const;
export type MechanicBonusScore = (typeof MECHANIC_BONUS_SCALE)[number];

export type MechanicBonusRosterInput = {
  mechanic1Name: string;
  mechanic2Name: string;
  mechanic3Name: string;
  googleFormUrl?: string | null;
  entryBillNo?: string | null;
  entryMechanic1Name?: string | null;
  entryMechanic1Rating?: string | null;
  entryMechanic2Name?: string | null;
  entryMechanic2Rating?: string | null;
  entryMechanic3Name?: string | null;
  entryMechanic3Rating?: string | null;
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

export function mechanicNames(roster: Pick<
  MechanicBonusRosterInput,
  "mechanic1Name" | "mechanic2Name" | "mechanic3Name"
>): [string, string, string] {
  return [roster.mechanic1Name.trim(), roster.mechanic2Name.trim(), roster.mechanic3Name.trim()];
}

export function rosterIsReady(roster: Pick<
  MechanicBonusRosterInput,
  "mechanic1Name" | "mechanic2Name" | "mechanic3Name"
>): boolean {
  return mechanicNames(roster).every((name) => name.length >= 2);
}

export function bonusAverage(ratings: [number, number, number]): number {
  return Math.round(((ratings[0] + ratings[1] + ratings[2]) / 3) * 10) / 10;
}

export function toGoogleFormResponseUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return null;
  const match = trimmed.match(
    /https:\/\/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)\/(?:viewform|formResponse)/,
  );
  if (!match) return null;
  return `https://docs.google.com/forms/d/e/${match[1]}/formResponse`;
}

export function normalizeEntryId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const match = trimmed.match(/^(?:entry\.)?(\d+)$/);
  return match ? `entry.${match[1]}` : null;
}

export function buildGoogleFormPayload(
  roster: MechanicBonusRosterInput,
  rating: MechanicBonusRatingInput & {
    mechanic1Name: string;
    mechanic2Name: string;
    mechanic3Name: string;
  },
): { url: string; body: URLSearchParams } | null {
  const url = toGoogleFormResponseUrl(roster.googleFormUrl);
  const bill = normalizeEntryId(roster.entryBillNo);
  const names = [
    normalizeEntryId(roster.entryMechanic1Name),
    normalizeEntryId(roster.entryMechanic2Name),
    normalizeEntryId(roster.entryMechanic3Name),
  ];
  const scores = [
    normalizeEntryId(roster.entryMechanic1Rating),
    normalizeEntryId(roster.entryMechanic2Rating),
    normalizeEntryId(roster.entryMechanic3Rating),
  ];
  if (!url || !bill || names.some((id) => !id) || scores.some((id) => !id)) {
    return null;
  }

  const body = new URLSearchParams();
  body.set(bill, rating.billNo.trim());
  body.set(names[0]!, rating.mechanic1Name);
  body.set(scores[0]!, String(rating.mechanic1Rating));
  body.set(names[1]!, rating.mechanic2Name);
  body.set(scores[1]!, String(rating.mechanic2Rating));
  body.set(names[2]!, rating.mechanic3Name);
  body.set(scores[2]!, String(rating.mechanic3Rating));
  return { url, body };
}

export async function submitMechanicBonusToGoogleForm(
  roster: MechanicBonusRosterInput,
  rating: MechanicBonusRatingInput & {
    mechanic1Name: string;
    mechanic2Name: string;
    mechanic3Name: string;
  },
): Promise<{ sent: boolean; error?: string }> {
  const payload = buildGoogleFormPayload(roster, rating);
  if (!payload) {
    return { sent: false, error: "Google Form URL or entry IDs are not set." };
  }

  try {
    const response = await fetch(payload.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.body,
      redirect: "manual",
    });
    if (response.status >= 400) {
      return { sent: false, error: `Google Form returned ${response.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "Could not reach Google Form." };
  }
}
