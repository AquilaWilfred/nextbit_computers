// hooks/useMapMarkers.ts
import { useRef, useCallback } from "react";
import { buildBranchIcon, buildPopupHtml } from "@/components/map/MapMaker";
import { formatDistance, formatDuration, isValidCoordinates } from "@/lib/utils/mapUtils";
import { MapMarker } from "@/components/map/types";

export function useMapMarkers(
  L: any,
  mapRef: React.RefObject<any>,
  markers: MapMarker[],
  selectedMarkerId: number | undefined,
  onMarkerClick: ((id: number) => void) | undefined,
  getUserLocation: () => Promise<{ lat: number; lng: number }>,
  drawUserRoute: (origin: [number, number], destination: [number, number]) => Promise<any>,
  fetchBoundaryForAddress: (address?: string) => Promise<void>
) {
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);
  const previousMarkerCountRef = useRef<number>(0);

  const drawUserMarker = useCallback((lat: number, lng: number) => {
    if (!L || !mapRef.current) return;
    
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      return;
    }
    
    const icon = L.divIcon({
      className: "leaflet-user-marker",
      html: `<div class="leaflet-user-dot"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    
    userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
    userMarkerRef.current.setZIndexOffset(1000);
  }, [L, mapRef]);

  const showBranchPopup = useCallback((marker: any, branch: MapMarker, distance?: number, duration?: number) => {
    if (!L || !mapRef.current) return;
    
    const popupHtml = buildPopupHtml(branch, formatDistance, formatDuration, distance, duration);
    const popup = new L.Popup({ maxWidth: 280, className: "leaflet-route-popup" }).setContent(popupHtml);
    
    marker.bindPopup(popup).openPopup();
    
    mapRef.current.once("popupopen", () => {
      const button = document.getElementById(`clear-route-${branch.id}`);
      if (button) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          // This will be handled by parent
          marker.closePopup();
        });
      }
    });
  }, [L, mapRef]);

  const placeMarkers = useCallback(async () => {
    if (!L || !mapRef.current) return;
    
    if (!markersLayerRef.current) {
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    
    markersLayerRef.current.clearLayers();
    
    if (!markers.length) return;
    
    const bounds = L.latLngBounds([]);
    
    for (const branch of markers) {
      if (!isValidCoordinates(branch.lat, branch.lng)) continue;
      
      const marker = L.marker([branch.lat, branch.lng], {
        icon: buildBranchIcon(branch, selectedMarkerId !== undefined && branch.id === selectedMarkerId, L),
      });
      
      marker.on("click", async () => {
        if (branch.id != null) onMarkerClick?.(branch.id);
        
        try {
          const userLocation = await getUserLocation();
          drawUserMarker(userLocation.lat, userLocation.lng);
          
          const routeInfo = await drawUserRoute(
            [userLocation.lat, userLocation.lng],
            [branch.lat, branch.lng]
          );
          
          fetchBoundaryForAddress(branch.address);
          showBranchPopup(marker, branch, routeInfo?.distance, routeInfo?.duration);
        } catch (error: any) {
          console.error("Failed to show route:", error);
        }
      });
      
      marker.addTo(markersLayerRef.current);
      bounds.extend([branch.lat, branch.lng]);
    }
    
    // Fit bounds if needed
    const shouldFitBounds = !hasFittedBoundsRef.current || markers.length !== previousMarkerCountRef.current;
    if (shouldFitBounds) {
      if (markers.length === 1 && markers[0]) {
        mapRef.current.setView([markers[0].lat, markers[0].lng], 15);
      } else if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
        if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(12);
      }
      hasFittedBoundsRef.current = true;
      previousMarkerCountRef.current = markers.length;
    }
  }, [L, mapRef, markers, selectedMarkerId, onMarkerClick, getUserLocation, drawUserRoute, fetchBoundaryForAddress, drawUserMarker, showBranchPopup]);

  const fitBoundsToMarkers = useCallback(() => {
    if (!L || !mapRef.current || !markers.length) return;
    
    const validMarkers = markers.filter(m => isValidCoordinates(m.lat, m.lng));
    if (!validMarkers.length) return;
    
    const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
    if (!bounds.isValid()) return;
    
    if (validMarkers.length === 1) {
      mapRef.current.setView(bounds.getCenter(), 15);
      return;
    }
    
    mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(12);
  }, [L, mapRef, markers]);

  const clearUserMarker = useCallback(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, []);

  return {
    markersLayerRef,
    userMarkerRef,
    placeMarkers,
    fitBoundsToMarkers,
    drawUserMarker,
    clearUserMarker,
    showBranchPopup,
  };
}