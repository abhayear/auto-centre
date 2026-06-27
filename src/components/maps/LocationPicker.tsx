"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_LOCATION } from "@/lib/constants";
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
  parseGooglePlace,
  type ParsedLocation,
} from "@/lib/google-maps";
import { GoogleMapView } from "./GoogleMapView";

export type { ParsedLocation };

type LocationPickerProps = {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: ParsedLocation | null) => void;
  error?: string;
  disabled?: boolean;
};

export function LocationPicker({
  value,
  onChange,
  onLocationSelect,
  error,
  disabled,
}: LocationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ParsedLocation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasApiKey = Boolean(getGoogleMapsApiKey());

  const onChangeRef = useRef(onChange);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onChangeRef.current = onChange;
    onLocationSelectRef.current = onLocationSelect;
  }, [onChange, onLocationSelect]);

  useEffect(() => {
    if (!hasApiKey || !inputRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let listener: google.maps.MapsEventListener | null = null;
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return;

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "in" },
          fields: ["address_components", "formatted_address", "geometry", "name"],
          types: ["geocode"],
        });

        autocomplete.setBounds(
          new google.maps.LatLngBounds(
            { lat: STORE_LOCATION.lat - 0.45, lng: STORE_LOCATION.lng - 0.45 },
            { lat: STORE_LOCATION.lat + 0.45, lng: STORE_LOCATION.lng + 0.45 }
          )
        );

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place) return;

          const parsed = parseGooglePlace(place);
          if (!parsed) return;

          setSelectedLocation(parsed);
          onChangeRef.current(parsed.displayLabel);
          onLocationSelectRef.current(parsed);
        });

        setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Google Maps could not be loaded. You can still type your area manually.");
        }
      });

    return () => {
      cancelled = true;
      listener?.remove();
      autocomplete = null;
    };
  }, [hasApiKey]);

  function handleManualChange(nextValue: string) {
    onChange(nextValue);
    setSelectedLocation(null);
    onLocationSelect(null);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLoadError("Location access is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const google = await loadGoogleMaps();
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({
            location: { lat: latitude, lng: longitude },
          });

          const result = response.results[0];
          if (!result) {
            setLoadError("Could not resolve your current location.");
            return;
          }

          const parsed = parseGooglePlace(result);
          if (!parsed) return;

          setSelectedLocation(parsed);
          onChange(parsed.displayLabel);
          onLocationSelect(parsed);
          setLoadError(null);
        } catch {
          setLoadError("Could not resolve your current location.");
        }
      },
      () => {
        setLoadError("Location permission denied. Search for your area instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const mapCenter = selectedLocation?.lat && selectedLocation?.lng
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
    : STORE_LOCATION;

  const mapMarkers = selectedLocation?.lat && selectedLocation?.lng
    ? [{ lat: selectedLocation.lat, lng: selectedLocation.lng, title: "Your location" }]
    : [{ lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, title: "Auto Galaxy" }];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="customerArea" className="block text-sm font-medium text-slate-300">
          Your location
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            id="customerArea"
            name="customerAreaDisplay"
            type="text"
            value={value}
            onChange={(e) => handleManualChange(e.target.value)}
            placeholder={
              hasApiKey
                ? "Search on Google Maps — e.g. Civil Line, Lalitpur"
                : "e.g. Lalitpur, Civil Line, 284403"
            }
            disabled={disabled}
            autoComplete="off"
            className={cn(
              "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500",
              error && "border-red-500"
            )}
          />
          {hasApiKey && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={disabled}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              <Navigation className="h-4 w-4" />
              Use my location
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {hasApiKey && mapsReady && (
          <p className="text-xs text-slate-500">
            Start typing and pick a suggestion from Google Maps, or use your current location.
          </p>
        )}
        {loadError && <p className="text-xs text-amber-400">{loadError}</p>}
        {!hasApiKey && (
          <p className="text-xs text-amber-400">
            Add <code className="text-amber-200">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable
            Google Maps search.
          </p>
        )}
      </div>

      {hasApiKey && (
        <GoogleMapView center={mapCenter} zoom={selectedLocation ? 14 : 12} markers={mapMarkers} />
      )}
    </div>
  );
}
