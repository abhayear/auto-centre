import { describe, expect, it } from "vitest";
import { mechanicReferralSchema } from "../validators";
import {
  MECHANIC_EXPERTISE,
  formatMechanicExpertise,
  referralFromFormData,
} from "../mechanic-referral";

describe("MECHANIC_EXPERTISE", () => {
  it("covers electrical, petrol, battery, motor, controller, and charger repair", () => {
    expect(MECHANIC_EXPERTISE).toEqual([
      "electrical",
      "petrol",
      "battery",
      "motor",
      "controller",
      "charger",
    ]);
  });
});

describe("formatMechanicExpertise", () => {
  it("lists selected repair skills", () => {
    expect(formatMechanicExpertise(["battery", "charger", "unknown"])).toBe(
      "Battery, Charger repair",
    );
  });
});

describe("referralFromFormData", () => {
  it("reads complete mechanic referral details from the form", () => {
    const form = new FormData();
    form.set("name", " Ravi Kumar ");
    form.set("contactNo", "9876543210");
    form.set("address", "12 MG Road, Pune");
    form.set("yearsOfExpertise", "8");
    form.append("expertise", "electrical");
    form.append("expertise", "motor");
    expect(referralFromFormData(form)).toEqual({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: 8,
      expertise: ["electrical", "motor"],
    });
  });
});

describe("mechanicReferralSchema", () => {
  it("requires name, contact, address, years, and at least one expertise", () => {
    const parsed = mechanicReferralSchema.parse({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: "8",
      expertise: ["battery", "controller", "charger"],
    });
    expect(parsed.yearsOfExpertise).toBe(8);
    expect(parsed.expertise).toEqual(["battery", "controller", "charger"]);
  });

  it("rejects a referral with no expertise", () => {
    const result = mechanicReferralSchema.safeParse({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: 8,
      expertise: [],
    });
    expect(result.success).toBe(false);
  });
});
