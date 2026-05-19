// hooks/useMapRoutes.ts
import { useRef, useCallback } from "react";
import { OSRM_ROUTE_URL } from "@/constants/mapConstants";
import { getDistanceKm, formatDistance, formatDuration } from "@/lib/utils/mapUtils";

export interface RouteInfo {
  distance: number;
  duration: number;
  geometry?: any;
}

export function useMapRoutes(L: any, mapRef: React.MutableRefObject<any>) {
  const routeLayerRef = useRef<any>(null);
  const allRoutesLayerRef = useRef<any>(null);

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
  }, []);

  const clearAllRoutes = useCallback(() => {
    if (allRoutesLayerRef.current) {
      allRoutesLayerRef.current.clearLayers();
    }
  }, []);

  const drawUserRoute = useCallback(async (
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteInfo | null> => {
    if (!L || !mapRef.current) return null;
    clearRoute();

    const [originLat, originLng] = origin;
    const [destLat, destLng] = destination;
    const url = `${OSRM_ROUTE_URL}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("OSRM route failed");
      const data = await response.json();
      const route = data?.routes?.[0];

      if (route?.geometry) {
        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: { color: "#6366f1", weight: 5, opacity: 0.85 },
        }).addTo(mapRef.current);

        const bounds = routeLayerRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(12);
        }

        return {
          distance: route.legs?.[0]?.distance,
          duration: route.legs?.[0]?.duration,
          geometry: route.geometry,
        };
      }
      throw new Error("No route data");
    } catch (error) {
      // Fallback to straight line
      const line = L.polyline([origin, destination], {
        color: "#6366f1",
        weight: 5,
        opacity: 0.8,
        dashArray: "8,8",
      }).addTo(mapRef.current);
      routeLayerRef.current = line;

      const bounds = line.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(12);
      }

      const distance = getDistanceKm(origin[0], origin[1], destination[0], destination[1]) * 1000;
      const duration = (getDistanceKm(origin[0], origin[1], destination[0], destination[1]) / 80) * 3600;
      return { distance, duration };
    }
  }, [L, mapRef, clearRoute]);

  const drawAllBranchRoutes = useCallback(async (markers: any[]) => {
    if (!L || !mapRef.current || markers.length < 2) return;
    clearAllRoutes();

    const pairs: Array<[any, any]> = [];
    markers.forEach((origin, index) => {
      markers.slice(index + 1).forEach((destination) => {
        pairs.push([origin, destination]);
      });
    });

    await Promise.all(
      pairs.map(async ([origin, destination], index) => {
        const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
        try {
          const response = await fetch(
            `${OSRM_ROUTE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
          );
          if (!response.ok) throw new Error("OSRM failed");
          const data = await response.json();
          const geometry = data?.routes?.[0]?.geometry;
          if (geometry) {
            L.geoJSON(geometry, {
              style: { color: colors[index % colors.length], weight: 4, opacity: 0.75 },
            }).addTo(allRoutesLayerRef.current);
          } else {
            throw new Error("No geometry");
          }
        } catch {
          L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], {
            color: colors[index % colors.length],
            weight: 4,
            opacity: 0.6,
            dashArray: "6,8",
          }).addTo(allRoutesLayerRef.current);
        }
      })
    );
  }, [L, mapRef, clearAllRoutes]);

  return {
    routeLayerRef,
    allRoutesLayerRef,
    clearRoute,
    clearAllRoutes,
    drawUserRoute,
    drawAllBranchRoutes,
  };
}