"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Navigation } from "lucide-react";
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
  autoDetectLocation?: boolean;
};

export function LocationPicker({
  value,
  onChange,
  onLocationSelect,
  error,
  disabled,
  autoDetectLocation = true,
}: LocationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ParsedLocation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const autoDetectAttempted = useRef(false);
  const hasApiKey = Boolean(getGoogleMapsApiKey());

  const onChangeRef = useRef(onChange);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onChangeRef.current = onChange;
    onLocationSelectRef.current = onLocationSelect;
  }, [onChange, onLocationSelect]);

  const applyLocation = useCallback((parsed: ParsedLocation) => {
    setSelectedLocation(parsed);
    onChangeRef.current(parsed.displayLabel);
    onLocationSelectRef.current(parsed);
    setLoadError(null);
  }, []);

  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLoadError("Location access is not supported in this browser.");
      return;
    }

    setDetectingLocation(true);
    setLoadError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          if (hasApiKey) {
            const google = await loadGoogleMaps();
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({
              location: { lat: latitude, lng: longitude },
            });

            const result = response.results[0];
            if (result) {
              const parsed = parseGooglePlace(result);
              if (parsed) {
                applyLocation(parsed);
                setDetectingLocation(false);
                return;
              }
            }
          }

          applyLocation({
            formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            displayLabel: "Current location",
            lat: latitude,
            lng: longitude,
          });
        } catch {
          applyLocation({
            formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            displayLabel: "Current location",
            lat: latitude,
            lng: longitude,
          });
        } finally {
          setDetectingLocation(false);
        }
      },
      (geoError) => {
        setDetectingLocation(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLoadError("Location permission denied. Search for your area or tap Use my location.");
        } else {
          setLoadError("Could not get your location. Search for your area instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [applyLocation, hasApiKey]);

  useEffect(() => {
    if (autoDetectLocation && !autoDetectAttempted.current && !disabled) {
      autoDetectAttempted.current = true;
      void detectCurrentLocation();
    }
  }, [autoDetectLocation, detectCurrentLocation, disabled]);

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

          applyLocation(parsed);
        });

        setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Google Maps could not be loaded. Your GPS location still works for booking.");
        }
      });

    return () => {
      cancelled = true;
      listener?.remove();
      autocomplete = null;
    };
  }, [applyLocation, hasApiKey]);

  function handleManualChange(nextValue: string) {
    onChange(nextValue);
    setSelectedLocation(null);
    onLocationSelect(null);
  }

  const mapCenter =
    selectedLocation?.lat != null && selectedLocation?.lng != null
      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
      : STORE_LOCATION;

  const mapMarkers =
    selectedLocation?.lat != null && selectedLocation?.lng != null
      ? [{ lat: selectedLocation.lat, lng: selectedLocation.lng, title: "Your location" }]
      : [{ lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng, title: "Auto Galaxy" }];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="customerArea" className="block text-sm font-medium text-slate-300">
          Your location
        </label>

        {detectingLocation && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            Detecting your current location…
          </div>
        )}

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
                ? "Or search on Google Maps — e.g. Civil Line, Lalitpur"
                : "e.g. Lalitpur, Civil Line, 284403"
            }
            disabled={disabled || detectingLocation}
            autoComplete="off"
            className={cn(
              "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500",
              error && "border-red-500"
            )}
          />
          <button
            type="button"
            onClick={() => void detectCurrentLocation()}
            disabled={disabled || detectingLocation}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-600/20 disabled:opacity-50"
          >
            <Navigation className="h-4 w-4" />
            Use my location
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!detectingLocation && !loadError && (
          <p className="text-xs text-slate-500">
            We use your current location automatically to check if we can service your area.
          </p>
        )}
        {hasApiKey && mapsReady && !detectingLocation && (
          <p className="text-xs text-slate-500">
            You can also search and pick a different address from Google Maps.
          </p>
        )}
        {loadError && <p className="text-xs text-amber-400">{loadError}</p>}
      </div>

      {(hasApiKey || (selectedLocation?.lat != null && selectedLocation?.lng != null)) && (
        <GoogleMapView center={mapCenter} zoom={selectedLocation ? 14 : 12} markers={mapMarkers} />
      )}
    </div>
  );
}
