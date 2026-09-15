import { describe, expect, it } from "vitest";
import { mechanicBonusRatingSchema, mechanicBonusRosterSchema } from "../validators";
import {
  bonusAverage,
  isRosterMechanic,
  rosterFromFormData,
  rosterIsReady,
} from "../mechanic-bonus";

describe("rosterIsReady", () => {
  it("needs at least one mechanic name from the manager", () => {
    expect(rosterIsReady({ names: ["Ravi", "Imran"] })).toBe(true);
    expect(rosterIsReady({ names: ["P"] })).toBe(true);
    expect(rosterIsReady({ names: [] })).toBe(false);
    expect(rosterIsReady({ names: ["", "  "] })).toBe(false);
  });
});

describe("mechanicBonusRosterSchema", () => {
  it("saves any number of mechanic names", () => {
    expect(
      mechanicBonusRosterSchema.parse({
        names: ["Ravi", "Imran", "Suresh", "P"],
        googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLExample/viewform",
      }),
    ).toEqual({ names: ["Ravi", "Imran", "Suresh", "P"] });
  });

  it("rejects an empty roster", () => {
    const result = mechanicBonusRosterSchema.safeParse({ names: [] });
    expect(result.success).toBe(false);
  });
});

describe("mechanicBonusRatingSchema", () => {
  it("accepts a rating for only one mechanic", () => {
    expect(
      mechanicBonusRatingSchema.parse({
        billNo: "AG-1042",
        mechanicName: "Imran",
        rating: "5",
      }),
    ).toEqual({
      billNo: "AG-1042",
      mechanicName: "Imran",
      rating: 5,
    });
  });
});

describe("isRosterMechanic", () => {
  it("only allows rating a mechanic the manager named", () => {
    expect(isRosterMechanic({ names: ["Ravi", "Imran"] }, "Imran")).toBe(true);
    expect(isRosterMechanic({ names: ["Ravi", "Imran"] }, "Suresh")).toBe(false);
  });
});

describe("bonusAverage", () => {
  it("averages scores for one mechanic's bonus", () => {
    expect(bonusAverage([5, 4, 3])).toBe(4);
    expect(bonusAverage([5, 5, 4])).toBe(4.7);
    expect(bonusAverage([])).toBe(0);
  });
});

describe("rosterFromFormData", () => {
  it("reads every mechanic name the manager added", () => {
    const form = new FormData();
    form.append("mechanicName", " Ravi ");
    form.append("mechanicName", "Imran");
    form.append("mechanicName", "");
    form.append("mechanicName", "Suresh");
    expect(rosterFromFormData(form)).toEqual({
      names: ["Ravi", "Imran", "Suresh"],
    });
  });
});
