// components/map/MapView.tsx
"use client";

import { forwardRef, useEffect, useRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useLeaflet } from "@/hooks/map/useLeaflet";
import { useGeolocation } from "@/hooks/map/useGeolocation";
import { useMapRoutes } from "@/hooks/map/useMapRoutes";
import { useMapMarkers } from "@/hooks/map/useMapMarkers";
import { useMapBoundary } from "@/hooks/map/useMapBoundary";
import { DEFAULT_CENTER } from "@/constants/mapConstants";
import { MapHandle, MapMarker } from "./types";

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: number;
  onMarkerClick?: (id: number) => void;
  onClick?: (lat: number, lng: number) => void;
  onMapReady?: (map: any) => void;
  boundaryQuery?: string;
  hideRecenter?: boolean;
}

export const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(
  {
    className,
    initialCenter = DEFAULT_CENTER,
    initialZoom = 13,
    markers = [],
    selectedMarkerId,
    onMarkerClick,
    onClick,
    onMapReady,
    boundaryQuery,
    hideRecenter = false,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const { L, loading: leafletLoading } = useLeaflet();
  const { getUserLocation } = useGeolocation();
  const routes = useMapRoutes(L, mapRef);
  const boundary = useMapBoundary(L, mapRef);
  
  const { markersLayerRef, placeMarkers, fitBoundsToMarkers } = useMapMarkers(
    L, mapRef, markers, selectedMarkerId, onMarkerClick,
    getUserLocation, routes.drawUserRoute, boundary.fetchBoundaryForAddress
  );

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainer.current || mapRef.current) return;

    const safeCenter = (!initialCenter || isNaN(initialCenter.lat) || isNaN(initialCenter.lng))
      ? DEFAULT_CENTER
      : initialCenter;

    const map = L.map(mapContainer.current, {
      center: [safeCenter.lat, safeCenter.lng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    if (onClick) {
      map.on("click", (event: any) => onClick(event.latlng.lat, event.latlng.lng));
    }

    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L, initialCenter, initialZoom, onClick, onMapReady]);

  // Place markers when they change
  useEffect(() => {
    if (!mapRef.current || !L) return;
    placeMarkers();
  }, [markers, selectedMarkerId, L]);

  // Handle boundary query
  useEffect(() => {
    if (!boundaryQuery) {
      boundary.clearBoundary();
      return;
    }
    boundary.fetchBoundaryForAddress(boundaryQuery);
  }, [boundaryQuery, boundary]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom = 15) => {
      mapRef.current?.flyTo([lat, lng], zoom);
    },
    showRouteTo: async (lat: number, lng: number, origin?: { lat: number; lng: number }) => {
      const from = origin ?? markers.find((m) => m.isMain) ?? markers[0];
      if (from) {
        await routes.drawUserRoute([from.lat, from.lng], [lat, lng]);
      }
    },
    clearRoute: routes.clearRoute,
  }), [markers, routes]);

  if (leafletLoading) {
    return <div className={cn("w-full h-full flex items-center justify-center", className)}>Loading map...</div>;
  }

  return <div ref={mapContainer} className={cn("w-full h-full", className)} />;
});