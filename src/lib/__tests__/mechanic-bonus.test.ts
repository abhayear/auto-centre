import { describe, expect, it } from "vitest";
import { mechanicBonusRosterSchema } from "../validators";
import { bonusAverage, rosterIsReady } from "../mechanic-bonus";

const roster = {
  mechanic1Name: "Ravi",
  mechanic2Name: "Imran",
  mechanic3Name: "Suresh",
};

describe("rosterIsReady", () => {
  it("needs three mechanic names from the manager", () => {
    expect(rosterIsReady(roster)).toBe(true);
    expect(rosterIsReady({ ...roster, mechanic3Name: "" })).toBe(false);
  });
});

describe("mechanicBonusRosterSchema", () => {
  it("keeps only the three mechanic names for the website roster", () => {
    const parsed = mechanicBonusRosterSchema.parse({
      ...roster,
      googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLExample/viewform",
      entryBillNo: "entry.123",
    });
    expect(parsed).toEqual(roster);
    expect(parsed).not.toHaveProperty("googleFormUrl");
    expect(parsed).not.toHaveProperty("entryBillNo");
  });
});

describe("bonusAverage", () => {
  it("averages the three scores for bonus", () => {
    expect(bonusAverage([5, 4, 3])).toBe(4);
    expect(bonusAverage([5, 5, 4])).toBe(4.7);
  });
});
