import { describe, expect, it } from "vitest";
import { mechanicBonusRatingSchema, mechanicBonusRosterSchema } from "../validators";
import {
  bonusAverage,
  formatRatingSubmittedAt,
  isRosterMechanic,
  isUniqueConstraintError,
  mechanicMembers,
  normalizeBillNo,
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
    ).toEqual({ names: ["Ravi", "Imran", "Suresh", "P"], photoUrls: [] });
  });

  it("saves a passport photo next to each mechanic name", () => {
    expect(
      mechanicBonusRosterSchema.parse({
        names: ["Ravi", "Imran"],
        photoUrls: ["/uploads/mechanics/ravi.jpg", ""],
      }),
    ).toEqual({
      names: ["Ravi", "Imran"],
      photoUrls: ["/uploads/mechanics/ravi.jpg", null],
    });
  });

  it("allows a mechanic without a photo when others have one", () => {
    expect(
      mechanicBonusRosterSchema.parse({
        names: ["Ravi", "Imran"],
        photoUrls: [
          "https://store.public.blob.vercel-storage.com/mechanics/ravi.jpg",
          null,
        ],
      }),
    ).toEqual({
      names: ["Ravi", "Imran"],
      photoUrls: ["https://store.public.blob.vercel-storage.com/mechanics/ravi.jpg", null],
    });
  });

  it("rejects an empty roster", () => {
    const result = mechanicBonusRosterSchema.safeParse({ names: [] });
    expect(result.success).toBe(false);
  });
});

describe("normalizeBillNo", () => {
  it("treats the same bill number as one value even with spaces or case changes", () => {
    expect(normalizeBillNo(" ag-1042 ")).toBe("AG-1042");
    expect(normalizeBillNo("AG-1042")).toBe(normalizeBillNo("ag-1042"));
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

  it("stores one canonical bill number so a second rating cannot sneak in", () => {
    expect(
      mechanicBonusRatingSchema.parse({
        billNo: " ag-1042 ",
        mechanicName: "Imran",
        rating: 4,
      }).billNo,
    ).toBe("AG-1042");
  });
});

describe("isUniqueConstraintError", () => {
  it("detects a repeated bill number from the database", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError(new Error("Failed to save rating"))).toBe(false);
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

describe("formatRatingSubmittedAt", () => {
  it("shows the date and time the customer submitted the review", () => {
    const formatted = formatRatingSubmittedAt("2026-09-15T05:47:00.000Z");
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/Sep/i);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/11:17/);
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
      photoUrls: [null, null, null],
    });
  });

  it("keeps the passport photo beside the matching mechanic name", () => {
    const form = new FormData();
    form.append("mechanicName", "Ravi");
    form.append("mechanicPhoto", "/uploads/mechanics/ravi.jpg");
    form.append("mechanicName", "Imran");
    form.append("mechanicPhoto", "");
    expect(rosterFromFormData(form)).toEqual({
      names: ["Ravi", "Imran"],
      photoUrls: ["/uploads/mechanics/ravi.jpg", null],
    });
  });
});

describe("mechanicMembers", () => {
  it("pairs each name with its passport photo for the customer form", () => {
    expect(
      mechanicMembers({
        names: ["Ravi", "Imran"],
        photoUrls: ["/uploads/mechanics/ravi.jpg", null],
      }),
    ).toEqual([
      { name: "Ravi", photoUrl: "/uploads/mechanics/ravi.jpg" },
      { name: "Imran", photoUrl: null },
    ]);
  });
});
