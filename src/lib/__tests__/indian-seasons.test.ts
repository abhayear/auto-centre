import { describe, expect, it } from "vitest";
import { campaignDraftFromSeason, getIndianSeason } from "../indian-seasons";

describe("getIndianSeason", () => {
  it("prefers Ganesh over monsoon when they overlap", () => {
    expect(getIndianSeason(new Date(2026, 8, 1)).kind).toBe("ganesh");
  });

  it("detects monsoon in July", () => {
    const season = getIndianSeason(new Date(2026, 6, 15));
    expect(season.kind).toBe("monsoon");
    expect(season.priceDelta).toBeLessThan(0);
  });

  it("detects Republic Day", () => {
    expect(getIndianSeason(new Date(2026, 0, 26)).kind).toBe("republic_day");
  });

  it("wraps New Year across December and January", () => {
    expect(getIndianSeason(new Date(2026, 11, 28)).kind).toBe("new_year");
    expect(getIndianSeason(new Date(2027, 0, 2)).kind).toBe("new_year");
  });

  it("returns regular season outside windows", () => {
    expect(getIndianSeason(new Date(2026, 1, 10)).kind).toBe("none");
  });
});

describe("campaignDraftFromSeason", () => {
  it("names the homepage offer after the season", () => {
    const season = getIndianSeason(new Date(2026, 6, 15));
    const draft = campaignDraftFromSeason(season, new Date(2026, 6, 15));
    expect(draft.title).toBe("Monsoon offer");
    expect(draft.kind).toBe("monsoon");
  });
});
