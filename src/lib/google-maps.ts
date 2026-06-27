import { Loader } from "@googlemaps/js-api-loader";

let loadPromise: Promise<typeof google> | null = null;

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

export function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }

  if (!loadPromise) {
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places"],
    });
    loadPromise = loader.load();
  }

  return loadPromise;
}

export type ParsedLocation = {
  formattedAddress: string;
  displayLabel: string;
  locality?: string;
  sublocality?: string;
  postalCode?: string;
  adminArea?: string;
  lat?: number;
  lng?: number;
};

export type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function getComponent(components: AddressComponent[], type: string): string | undefined {
  return components.find((component) => component.types.includes(type))?.long_name;
}

export function parseAddressComponents(
  formattedAddress: string,
  components: AddressComponent[],
  lat?: number,
  lng?: number,
  placeName?: string
): ParsedLocation {
  const locality =
    getComponent(components, "locality") ??
    getComponent(components, "administrative_area_level_2");
  const sublocality =
    getComponent(components, "sublocality") ??
    getComponent(components, "sublocality_level_1") ??
    getComponent(components, "neighborhood");
  const postalCode = getComponent(components, "postal_code");
  const adminArea = getComponent(components, "administrative_area_level_1");
  const displayLabel =
    [sublocality, locality, postalCode].filter(Boolean).join(", ") ||
    placeName ||
    formattedAddress;

  return {
    formattedAddress,
    displayLabel,
    locality,
    sublocality,
    postalCode,
    adminArea,
    lat,
    lng,
  };
}

export function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedLocation | null {
  const formattedAddress = place.formatted_address ?? place.name;
  if (!formattedAddress) return null;

  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return parseAddressComponents(
    formattedAddress,
    (place.address_components ?? []) as AddressComponent[],
    lat,
    lng,
    place.name
  );
}
