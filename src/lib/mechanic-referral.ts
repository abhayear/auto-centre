export const MECHANIC_EXPERTISE = [
  "electrical",
  "petrol",
  "battery",
  "motor",
  "controller",
  "charger",
] as const;

export type MechanicExpertise = (typeof MECHANIC_EXPERTISE)[number];

export const MECHANIC_EXPERTISE_LABELS: Record<MechanicExpertise, string> = {
  electrical: "Electrical",
  petrol: "Petrol",
  battery: "Battery",
  motor: "Motor",
  controller: "Controller",
  charger: "Charger repair",
};

export const MECHANIC_REFERRAL_LABOUR_OFF_RUPEES = 500;
export const MECHANIC_REFERRAL_STAY_DAYS = 15;

export type MechanicReferralInput = {
  name: string;
  contactNo: string;
  address: string;
  yearsOfExpertise: number;
  expertise: string[];
  referrerName: string;
  referrerContact: string;
};

export type ReferralRewardState = "pending_hire" | "waiting_stay" | "due" | "given";

export function isMechanicExpertise(value: string): value is MechanicExpertise {
  return MECHANIC_EXPERTISE.includes(value as MechanicExpertise);
}

export function formatMechanicExpertise(values: string[]): string {
  return values.filter(isMechanicExpertise).map((value) => MECHANIC_EXPERTISE_LABELS[value]).join(", ");
}

export function referralFromFormData(form: FormData): MechanicReferralInput {
  return {
    name: String(form.get("name") ?? "").trim(),
    contactNo: String(form.get("contactNo") ?? "").trim(),
    address: String(form.get("address") ?? "").trim(),
    yearsOfExpertise: Number(form.get("yearsOfExpertise") ?? 0),
    expertise: form.getAll("expertise").map(String),
    referrerName: String(form.get("referrerName") ?? "").trim(),
    referrerContact: String(form.get("referrerContact") ?? "").trim(),
  };
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function referralRewardState(
  referral: { hiredAt: Date | string | null; rewardedAt: Date | string | null },
  now = new Date(),
): ReferralRewardState {
  if (toDate(referral.rewardedAt)) return "given";
  const hiredAt = toDate(referral.hiredAt);
  if (!hiredAt) return "pending_hire";
  const stayMs = MECHANIC_REFERRAL_STAY_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - hiredAt.getTime() >= stayMs ? "due" : "waiting_stay";
}

export function referralRewardLabel(state: ReferralRewardState): string {
  if (state === "pending_hire") return "Not hired yet";
  if (state === "waiting_stay") return `Waiting ${MECHANIC_REFERRAL_STAY_DAYS} days`;
  if (state === "due") return `Give ₹${MECHANIC_REFERRAL_LABOUR_OFF_RUPEES} labour off`;
  return "₹500 labour off given";
}
