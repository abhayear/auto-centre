import { describe, expect, it } from "vitest";
import { getIndianSeason } from "../indian-seasons";
import { buildPriceSuggestions, roundInr, suggestPrice } from "../price-suggestions";

describe("roundInr", () => {
  it("rounds to the nearest hundred", () => {
    expect(roundInr(87450)).toBe(87500);
    expect(roundInr(50)).toBe(100);
  });
});

describe("suggestPrice", () => {
  const monsoon = getIndianSeason(new Date(2026, 6, 15));
  const diwali = getIndianSeason(new Date(2026, 10, 1));

  it("cuts vs sold-average in monsoon", () => {
    expect(suggestPrice(100000, 100000, monsoon)).toBe(97000);
  });

  it("lifts vs sold-average at Diwali", () => {
    expect(suggestPrice(100000, 100000, diwali)).toBe(103000);
  });

  it("falls back to current list when nothing has sold", () => {
    expect(suggestPrice(80000, null, monsoon)).toBe(77600);
  });

  it("clamps extreme suggestions to 25% of current", () => {
    expect(suggestPrice(100000, 200000, diwali)).toBe(125000);
    expect(suggestPrice(100000, 10000, monsoon)).toBe(75000);
  });
});

describe("buildPriceSuggestions", () => {
  const season = getIndianSeason(new Date(2026, 6, 15));

  it("uses sold history for the same make and model", () => {
    const suggestions = buildPriceSuggestions(
      [
        { id: "a", make: "Ola", model: "S1", year: 2024, price: 110000, status: "available" },
        { id: "b", make: "Ola", model: "S1", year: 2023, price: 100000, status: "sold" },
        { id: "c", make: "Ola", model: "S1", year: 2022, price: 90000, status: "sold" },
      ],
      season,
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].soldSampleSize).toBe(2);
    expect(suggestions[0].soldAverage).toBe(95000);
    expect(suggestions[0].suggestedPrice).toBe(92200);
  });
});
