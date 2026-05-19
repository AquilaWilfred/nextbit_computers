// hooks/useBranchGeolocation.ts
import { useState, useEffect, useCallback, RefObject } from "react";
import { Branch, MapHandle } from "@/types/home.types";
import { getDistanceSquared } from "@/lib/utils/homeHelpers";

export function useBranchGeolocation({
  branches,
  filteredBranches,
  mapRef,
}: {
  branches: Branch[] | undefined;
  filteredBranches: Branch[];
  mapRef: RefObject<MapHandle | null>;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [geoAttempted, setGeoAttempted] = useState(false);

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId) ?? filteredBranches[0] ?? null;

  const mapCenter = selectedBranch
    ? { lat: parseFloat(String(selectedBranch.lat)), lng: parseFloat(String(selectedBranch.lng)) }
    : { lat: -1.2921, lng: 36.8219 };
  const mapZoom = selectedBranch ? 14 : 10;

  const setSelectedBranch = useCallback((branch: Branch) => {
    setSelectedBranchId(branch.id);
    mapRef.current?.clearRoute();
    if (branch.lat && branch.lng) {
      mapRef.current?.flyTo(Number(branch.lat), Number(branch.lng), 14);
    }
  }, [mapRef]);

  // Auto-select first branch when filtered list changes
  useEffect(() => {
    if (!filteredBranches.length) {
      setSelectedBranchId(null);
      return;
    }
    if (selectedBranchId === null || !filteredBranches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId(filteredBranches[0].id);
    }
  }, [filteredBranches, selectedBranchId]);

  // Geolocation: find nearest branch on first load
  useEffect(() => {
    if (geoAttempted || !branches?.length) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoAttempted(true);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        let nearest = branches[0];
        let bestDist = Infinity;
        for (const b of branches) {
          const lat = Number(b.lat), lng = Number(b.lng);
          if (isNaN(lat) || isNaN(lng)) continue;
          const d = getDistanceSquared(latitude, longitude, lat, lng);
          if (d < bestDist) {
            bestDist = d;
            nearest = b;
          }
        }
        if (nearest?.id != null) {
          setSelectedBranchId(nearest.id);
          mapRef.current?.flyTo(Number(nearest.lat), Number(nearest.lng), 14);
        }
        setGeoAttempted(true);
      },
      () => setGeoAttempted(true),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 300_000 }
    );
  }, [branches, geoAttempted, mapRef]);

  return {
    selectedBranch,
    selectedBranchId,
    setSelectedBranch,
    mapCenter,
    mapZoom,
  };
}