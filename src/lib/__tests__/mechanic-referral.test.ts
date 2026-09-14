import { describe, expect, it } from "vitest";
import { mechanicReferralSchema } from "../validators";
import {
  MECHANIC_EXPERTISE,
  MECHANIC_REFERRAL_LABOUR_OFF_RUPEES,
  MECHANIC_REFERRAL_STAY_DAYS,
  formatMechanicExpertise,
  referralFromFormData,
  referralRewardState,
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
  it("reads mechanic details and the customer who referred them", () => {
    const form = new FormData();
    form.set("name", " Ravi Kumar ");
    form.set("contactNo", "9876543210");
    form.set("address", "12 MG Road, Pune");
    form.set("yearsOfExpertise", "8");
    form.set("referrerName", " Anita ");
    form.set("referrerContact", "9123456780");
    form.append("expertise", "electrical");
    form.append("expertise", "motor");
    expect(referralFromFormData(form)).toEqual({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: 8,
      expertise: ["electrical", "motor"],
      referrerName: "Anita",
      referrerContact: "9123456780",
    });
  });
});

describe("mechanicReferralSchema", () => {
  it("requires mechanic details plus the referring customer's name and mobile", () => {
    const parsed = mechanicReferralSchema.parse({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: "8",
      expertise: ["battery", "controller", "charger"],
      referrerName: "Anita",
      referrerContact: "9123456780",
    });
    expect(parsed.yearsOfExpertise).toBe(8);
    expect(parsed.referrerName).toBe("Anita");
    expect(parsed.expertise).toEqual(["battery", "controller", "charger"]);
  });

  it("rejects a referral with no expertise", () => {
    const result = mechanicReferralSchema.safeParse({
      name: "Ravi Kumar",
      contactNo: "9876543210",
      address: "12 MG Road, Pune",
      yearsOfExpertise: 8,
      expertise: [],
      referrerName: "Anita",
      referrerContact: "9123456780",
    });
    expect(result.success).toBe(false);
  });
});

describe("referralRewardState", () => {
  const now = new Date("2026-09-14T06:00:00.000Z");

  it("gives Rs 500 off labour only after hire and 15 days", () => {
    expect(MECHANIC_REFERRAL_LABOUR_OFF_RUPEES).toBe(500);
    expect(MECHANIC_REFERRAL_STAY_DAYS).toBe(15);
    expect(referralRewardState({ hiredAt: null, rewardedAt: null }, now)).toBe("pending_hire");
    expect(
      referralRewardState({ hiredAt: "2026-09-10T06:00:00.000Z", rewardedAt: null }, now),
    ).toBe("waiting_stay");
    expect(
      referralRewardState({ hiredAt: "2026-08-30T06:00:00.000Z", rewardedAt: null }, now),
    ).toBe("due");
    expect(
      referralRewardState(
        { hiredAt: "2026-08-01T06:00:00.000Z", rewardedAt: "2026-08-16T06:00:00.000Z" },
        now,
      ),
    ).toBe("given");
  });
});
