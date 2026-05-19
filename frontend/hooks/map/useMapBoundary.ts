// hooks/useMapBoundary.ts
import { useRef, useCallback } from "react";
import { NOMINATIM_SEARCH_URL, BRAND_COLOR } from "@/constants/mapConstants";
import { getCityFromAddress } from "@/lib/utils/mapUtils";

export function useMapBoundary(L: any, mapRef: React.RefObject<any>) {
  const boundaryLayerRef = useRef<any>(null);

  const clearBoundary = useCallback(() => {
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
      boundaryLayerRef.current = null;
    }
  }, []);

  const fetchBoundaryForAddress = useCallback(async (address?: string) => {
    if (!L || !mapRef.current) return;
    
    const city = getCityFromAddress(address);
    if (!city) return;
    
    clearBoundary();
    
    try {
      const response = await fetch(
        `${NOMINATIM_SEARCH_URL}?format=json&polygon_geojson=1&limit=1&q=${encodeURIComponent(city)}`
      );
      
      if (!response.ok) throw new Error("Boundary lookup failed");
      
      const data = await response.json();
      const place = data?.[0];
      
      if (!place?.geojson) return;
      
      boundaryLayerRef.current = L.geoJSON(place.geojson, {
        style: {
          color: BRAND_COLOR,
          weight: 2,
          opacity: 0.8,
          fillColor: BRAND_COLOR,
          fillOpacity: 0.1,
        },
      }).addTo(mapRef.current);
      
      if (boundaryLayerRef.current.getBounds?.().isValid()) {
        mapRef.current.fitBounds(boundaryLayerRef.current.getBounds(), { padding: [80, 80] });
        if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(12);
      }
    } catch (error) {
      console.warn("Boundary load failed", error);
    }
  }, [L, mapRef, clearBoundary]);

  return {
    boundaryLayerRef,
    clearBoundary,
    fetchBoundaryForAddress,
  };
}