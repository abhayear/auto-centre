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

export type MechanicReferralInput = {
  name: string;
  contactNo: string;
  address: string;
  yearsOfExpertise: number;
  expertise: string[];
};

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
  };
}
