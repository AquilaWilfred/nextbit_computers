// hooks/useMapControls.ts
import { useRef, useCallback } from "react";
import { createRecenterControl, createToggleRoutesControl, createInfoControl } from "@/components/map/MapControls";
import { MapMarker } from "@/components/map/types";

export function useMapControls(
  L: any,
  mapRef: React.RefObject<any>,
  markers: MapMarker[],
  getUserLocation: () => Promise<{ lat: number; lng: number }>,
  drawUserRoute: (origin: [number, number], destination: [number, number]) => Promise<any>,
  drawAllBranchRoutes: () => Promise<void>,
  clearAllRoutes: () => void,
  fetchBoundaryForAddress: (address?: string) => Promise<void>,
  drawUserMarker: (lat: number, lng: number) => void,
  toast: any
) {
  const userInfoControlRef = useRef<any>(null);
  const setInfoBoxContentRef = useRef<((html: string) => void) | null>(null);

  const setInfoBoxContent = useCallback((html: string) => {
    setInfoBoxContentRef.current?.(html);
  }, []);

  const addControls = useCallback(() => {
    if (!L || !mapRef.current) return;

    // Recenter control
    const recenterControl = createRecenterControl(
      L, getUserLocation, markers, drawUserRoute, 
      fetchBoundaryForAddress, setInfoBoxContent, drawUserMarker, toast
    );
    recenterControl.addTo(mapRef.current);

    // Info control
    const infoControl = createInfoControl(L, setInfoBoxContentRef);
    infoControl.addTo(mapRef.current);
    userInfoControlRef.current = infoControl;

    // Route toggle control
    const routeToggleControl = createToggleRoutesControl(
      L, markers, drawAllBranchRoutes, clearAllRoutes, toast
    );
    routeToggleControl.addTo(mapRef.current);
  }, [L, mapRef, markers, getUserLocation, drawUserRoute, drawAllBranchRoutes, clearAllRoutes, fetchBoundaryForAddress, drawUserMarker, toast]);

  return {
    userInfoControlRef,
    setInfoBoxContent,
    addControls,
  };
}