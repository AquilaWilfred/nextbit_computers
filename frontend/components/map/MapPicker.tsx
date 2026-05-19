// components/map/MapPicker.tsx
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLeaflet } from "@/hooks/map/useLeaflet";
import { DEFAULT_CENTER } from "@/constants/mapConstants";

interface MapPickerProps {
  className?: string;
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}

export function MapPicker({ className, lat, lng, onPick }: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { L, loading } = useLeaflet();

  useEffect(() => {
    if (!L || !mapContainer.current || mapRef.current) return;

    const center = lat != null && lng != null ? [lat, lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
    const zoom = lat != null && lng != null ? 15 : 6;

    const map = L.map(mapContainer.current, { center, zoom, zoomControl: true });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: "leaflet-admin-pin",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const placeMarker = (pickedLat: number, pickedLng: number) => {
      if (!markerRef.current) {
        markerRef.current = L.marker([pickedLat, pickedLng], { draggable: true, icon: markerIcon }).addTo(map);
        markerRef.current.on("dragend", (event: any) => {
          const pos = event.target.getLatLng();
          onPick(pos.lat, pos.lng);
        });
      } else {
        markerRef.current.setLatLng([pickedLat, pickedLng]);
      }
      onPick(pickedLat, pickedLng);
    };

    map.on("click", (event: any) => placeMarker(event.latlng.lat, event.latlng.lng));

    if (lat != null && lng != null) {
      placeMarker(lat, lng);
      map.setView([lat, lng], 15);
    }

    mapRef.current = map;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [L, lat, lng, onPick]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat == null || lng == null) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.flyTo([lat, lng], 15);
  }, [lat, lng]);

  if (loading) {
    return <div className={cn("w-full h-full flex items-center justify-center", className)}>Loading map...</div>;
  }

  return <div ref={mapContainer} className={cn("w-full h-full", className)} />;
}