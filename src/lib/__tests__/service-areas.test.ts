import { describe, expect, it } from "vitest";
import {
  checkLocationServiceability,
  checkRadiusServiceability,
  matchServiceArea,
  normalizeArea,
} from "../service-areas";

const centre = {
  latitude: 25.386945,
  longitude: 78.411017,
  radiusKm: 20,
  radiusCheckEnabled: true,
  label: "Auto Galaxy Service Centre",
};

const areas = [
  { name: "Lalitpur", pinCode: "284403", active: true },
  { name: "Civil Line, Lalitpur", pinCode: null, active: true },
  { name: "Jhansi", pinCode: "284001", active: true },
  { name: "Orai", pinCode: "285001", active: false },
];

describe("normalizeArea", () => {
  it("trims and lowercases", () => {
    expect(normalizeArea("  Lalitpur  ")).toBe("lalitpur");
  });
});

describe("matchServiceArea", () => {
  it("matches exact area name", () => {
    expect(matchServiceArea("Lalitpur", areas)).toEqual({
      serviceable: true,
      matchedArea: "Lalitpur",
    });
  });

  it("matches pin code", () => {
    expect(matchServiceArea("284403", areas)).toEqual({
      serviceable: true,
      matchedArea: "Lalitpur",
    });
  });

  it("matches partial locality names", () => {
    expect(matchServiceArea("Civil Line", areas)).toEqual({
      serviceable: true,
      matchedArea: "Civil Line, Lalitpur",
    });
  });

  it("rejects inactive areas", () => {
    expect(matchServiceArea("Orai", areas)).toEqual({ serviceable: false });
    expect(matchServiceArea("285001", areas)).toEqual({ serviceable: false });
  });

  it("matches using Google Maps locality and pin code terms", () => {
    expect(
      checkLocationServiceability(
        {
          formattedAddress: "Civil Line, Lalitpur, Uttar Pradesh 284403, India",
          locality: "Lalitpur",
          postalCode: "284403",
        },
        areas
      )
    ).toEqual({
      serviceable: true,
      matchedArea: "Lalitpur",
      method: "area_list",
    });
  });
});

describe("checkRadiusServiceability", () => {
  it("accepts locations within radius", () => {
    const result = checkRadiusServiceability(25.39, 78.42, centre);
    expect(result.serviceable).toBe(true);
    expect(result.distanceKm).toBeLessThanOrEqual(centre.radiusKm);
    expect(result.method).toBe("radius");
  });

  it("rejects locations outside radius", () => {
    const result = checkRadiusServiceability(28.6139, 77.209, centre);
    expect(result.serviceable).toBe(false);
    expect(result.distanceKm).toBeGreaterThan(centre.radiusKm);
  });

  it("uses radius when coordinates are provided", () => {
    const result = checkLocationServiceability(
      { lat: 25.39, lng: 78.42, area: "Unknown place" },
      areas,
      centre
    );
    expect(result.serviceable).toBe(true);
    expect(result.method).toBe("radius");
  });
});
