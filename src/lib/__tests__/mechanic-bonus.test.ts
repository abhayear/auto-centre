import { describe, expect, it } from "vitest";
import {
  bonusAverage,
  buildGoogleFormPayload,
  rosterIsReady,
  toGoogleFormResponseUrl,
} from "../mechanic-bonus";

const roster = {
  mechanic1Name: "Ravi",
  mechanic2Name: "Imran",
  mechanic3Name: "Suresh",
  googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLExample/viewform?usp=dialog",
  entryBillNo: "1234567890",
  entryMechanic1Name: "entry.111",
  entryMechanic1Rating: "222",
  entryMechanic2Name: "333",
  entryMechanic2Rating: "entry.444",
  entryMechanic3Name: "555",
  entryMechanic3Rating: "666",
};

describe("rosterIsReady", () => {
  it("needs three mechanic names from the manager", () => {
    expect(rosterIsReady(roster)).toBe(true);
    expect(rosterIsReady({ ...roster, mechanic3Name: "" })).toBe(false);
  });
});

describe("toGoogleFormResponseUrl", () => {
  it("turns a viewform link into formResponse", () => {
    expect(toGoogleFormResponseUrl(roster.googleFormUrl)).toBe(
      "https://docs.google.com/forms/d/e/1FAIpQLExample/formResponse",
    );
  });
});

describe("buildGoogleFormPayload", () => {
  it("maps bill number and three name/rating pairs onto entry ids", () => {
    const payload = buildGoogleFormPayload(roster, {
      billNo: "AG-1042",
      mechanic1Name: "Ravi",
      mechanic1Rating: 5,
      mechanic2Name: "Imran",
      mechanic2Rating: 4,
      mechanic3Name: "Suresh",
      mechanic3Rating: 3,
    });
    expect(payload?.url).toContain("/formResponse");
    expect(payload?.body.get("entry.1234567890")).toBe("AG-1042");
    expect(payload?.body.get("entry.111")).toBe("Ravi");
    expect(payload?.body.get("entry.222")).toBe("5");
    expect(payload?.body.get("entry.444")).toBe("4");
  });
});

describe("bonusAverage", () => {
  it("averages the three scores for bonus", () => {
    expect(bonusAverage([5, 4, 3])).toBe(4);
    expect(bonusAverage([5, 5, 4])).toBe(4.7);
  });
});
