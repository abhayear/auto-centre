import { describe, expect, it } from "vitest";
import { getDistanceKm, roundDistanceKm } from "../geo";

describe("getDistanceKm", () => {
  it("returns zero for the same point", () => {
    expect(getDistanceKm(25.386945, 78.411017, 25.386945, 78.411017)).toBe(0);
  });

  it("calculates distance between Lalitpur and nearby Jhansi", () => {
    const distance = roundDistanceKm(getDistanceKm(25.386945, 78.411017, 25.4484, 78.5685));
    expect(distance).toBeGreaterThan(15);
    expect(distance).toBeLessThan(25);
  });
});
