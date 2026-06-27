"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { STORE_LOCATION } from "@/lib/constants";
import { getGoogleMapsApiKey, loadGoogleMaps } from "@/lib/google-maps";

type MapMarker = {
  lat: number;
  lng: number;
  title?: string;
};

type GoogleMapViewProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
};

export function GoogleMapView({
  center = STORE_LOCATION,
  zoom = 13,
  markers = [],
  className,
}: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const markersKey = markers.map((marker) => `${marker.lat},${marker.lng},${marker.title ?? ""}`).join("|");

  useEffect(() => {
    if (!getGoogleMapsApiKey() || !containerRef.current) {
      setError("Map unavailable — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps.");
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center,
            zoom,
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
            ],
          });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(zoom);
        }

        for (const marker of markersRef.current) {
          marker.setMap(null);
        }
        markersRef.current = markers.map(
          (marker) =>
            new google.maps.Marker({
              map: mapRef.current,
              position: { lat: marker.lat, lng: marker.lng },
              title: marker.title,
            })
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load Google Maps.");
        }
      });

    return () => {
      cancelled = true;
    };
    // markersKey encodes marker positions; center lat/lng tracked separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom, markersKey]);

  if (error) {
    return (
      <div
        className={cn(
          "flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-4 text-center text-sm text-slate-500",
          className
        )}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-700/50", className)}
    />
  );
}
