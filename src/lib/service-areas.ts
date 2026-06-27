import { getDistanceKm, roundDistanceKm } from "./geo";

export type ServiceAreaRecord = {
  name: string;
  pinCode?: string | null;
  active: boolean;
};

export type ServiceCentreConfig = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  radiusCheckEnabled: boolean;
  label?: string;
};

export type LocationCheckInput = {
  area?: string;
  locality?: string;
  sublocality?: string;
  postalCode?: string;
  formattedAddress?: string;
  adminArea?: string;
  lat?: number;
  lng?: number;
};

export type ServiceabilityResult = {
  serviceable: boolean;
  matchedArea?: string;
  distanceKm?: number;
  method?: "radius" | "area_list";
};

export function normalizeArea(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function collectLocationSearchTerms(input: LocationCheckInput): string[] {
  const terms = [
    input.area,
    input.locality,
    input.sublocality,
    input.postalCode,
    input.formattedAddress,
    input.adminArea,
  ].filter((term): term is string => Boolean(term?.trim()));

  return [...new Set(terms)];
}

export function matchServiceArea(
  customerArea: string,
  areas: ServiceAreaRecord[]
): { serviceable: boolean; matchedArea?: string } {
  const normalized = normalizeArea(customerArea);
  if (!normalized) {
    return { serviceable: false };
  }

  for (const area of areas.filter((entry) => entry.active)) {
    const nameNorm = normalizeArea(area.name);

    if (
      normalized === nameNorm ||
      normalized.includes(nameNorm) ||
      nameNorm.includes(normalized)
    ) {
      return { serviceable: true, matchedArea: area.name };
    }

    const pinCode = area.pinCode?.trim();
    if (pinCode && normalized === pinCode.toLowerCase()) {
      return { serviceable: true, matchedArea: area.name };
    }
  }

  return { serviceable: false };
}

export function matchServiceAreaFromTerms(
  terms: string[],
  areas: ServiceAreaRecord[]
): { serviceable: boolean; matchedArea?: string } {
  for (const term of terms) {
    const result = matchServiceArea(term, areas);
    if (result.serviceable) {
      return result;
    }
  }

  return { serviceable: false };
}

export function checkRadiusServiceability(
  lat: number,
  lng: number,
  centre: ServiceCentreConfig
): ServiceabilityResult {
  const distanceKm = roundDistanceKm(
    getDistanceKm(centre.latitude, centre.longitude, lat, lng)
  );

  if (distanceKm <= centre.radiusKm) {
    return {
      serviceable: true,
      matchedArea: `${centre.label ?? "Service centre"} (${distanceKm} km away)`,
      distanceKm,
      method: "radius",
    };
  }

  return {
    serviceable: false,
    distanceKm,
    method: "radius",
  };
}

export function checkLocationServiceability(
  input: LocationCheckInput,
  areas: ServiceAreaRecord[],
  centre?: ServiceCentreConfig | null
): ServiceabilityResult {
  const hasCoordinates =
    typeof input.lat === "number" &&
    typeof input.lng === "number" &&
    !Number.isNaN(input.lat) &&
    !Number.isNaN(input.lng);

  if (centre?.radiusCheckEnabled && hasCoordinates) {
    const radiusResult = checkRadiusServiceability(input.lat!, input.lng!, centre);
    if (radiusResult.serviceable) {
      return radiusResult;
    }

    return {
      serviceable: false,
      distanceKm: radiusResult.distanceKm,
      method: "radius",
    };
  }

  const areaResult = matchServiceAreaFromTerms(collectLocationSearchTerms(input), areas);
  if (areaResult.serviceable) {
    return { ...areaResult, method: "area_list" };
  }

  return { serviceable: false };
}
