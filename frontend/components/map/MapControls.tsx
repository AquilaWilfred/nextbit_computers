// components/map/MapControls.tsx
import { formatDistance, formatDuration, getDistanceKm } from "@/lib/utils/mapUtils";
import { MapMarker } from "./types";

export const createRecenterControl = (
  L: any, 
  getUserLocation: () => Promise<{ lat: number; lng: number }>,
  markers: MapMarker[],
  drawUserRoute: (origin: [number, number], destination: [number, number]) => Promise<any>,
  fetchBoundaryForAddress: (address?: string) => Promise<void>,
  setInfoBoxContent: (html: string) => void,
  drawUserMarker: (lat: number, lng: number) => void,
  toast: any
) => {
  const Control = (L.Control as any).extend({
    options: { position: "bottomright" },
    onAdd(this: any) {
      const button = L.DomUtil.create("button", "leaflet-recenter-button") as HTMLButtonElement;
      button.type = "button";
      button.title = "Recenter to your position";
      button.innerHTML = "⤵";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);
      
      button.addEventListener("click", async (event: MouseEvent) => {
        L.DomEvent.stopPropagation(event);
        const map = this._map;
        if (!map) return;
        
        try {
          const location = await getUserLocation();
          drawUserMarker(location.lat, location.lng);
          
          const nearest = markers.reduce((closest, branch) => {
            const dist = getDistanceKm(location.lat, location.lng, branch.lat, branch.lng);
            const closestDist = closest ? getDistanceKm(location.lat, location.lng, closest.lat, closest.lng) : Infinity;
            return dist < closestDist ? branch : closest;
          }, null as MapMarker | null);
          
          if (!nearest) {
            toast.error("No branches available.");
            return;
          }
          
          const routeInfo = await drawUserRoute([location.lat, location.lng], [nearest.lat, nearest.lng]);
          setInfoBoxContent(`
            <strong>${nearest.title || nearest.name || "Nearest branch"}</strong>
            Distance: ${formatDistance(routeInfo?.distance ?? 0)}<br />
            ETA: ${formatDuration(routeInfo?.duration ?? 0)}
          `);
          fetchBoundaryForAddress(nearest.address);
        } catch (error: any) {
          toast.error(error?.message || "Unable to access your location.");
        }
      });
      
      return button;
    },
  });
  
  return new Control();
};

export const createToggleRoutesControl = (
  L: any,
  markers: MapMarker[],
  drawAllBranchRoutes: () => Promise<void>,
  clearAllRoutes: () => void,
  toast: any
) => {
  const Control = (L.Control as any).extend({
    options: { position: "topright" },
    onAdd(this: any) {
      const button = L.DomUtil.create("button", "leaflet-all-routes-button") as HTMLButtonElement;
      button.type = "button";
      button.title = "Toggle route network";
      button.innerText = "Show All Routes";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);
      
      button.addEventListener("click", async (event: MouseEvent) => {
        L.DomEvent.stopPropagation(event);
        
        if (!markers.length || markers.length < 2) {
          toast.error("At least two branches are required to show routes.");
          return;
        }
        
        if (button.innerText === "Show All Routes") {
          await drawAllBranchRoutes();
          button.innerText = "Hide Routes";
        } else {
          clearAllRoutes();
          button.innerText = "Show All Routes";
        }
      });
      
      return button;
    },
  });
  
  return new Control();
};

export const createInfoControl = (L: any, setInfoBoxContentRef: any) => {
  const Control = (L.Control as any).extend({
    options: { position: "bottomright" },
    onAdd(this: any) {
      const container = L.DomUtil.create("div", "leaflet-route-info-box-container") as HTMLDivElement;
      container.style.display = "none";
      setInfoBoxContentRef.current = (html: string) => {
        container.innerHTML = `<div class="leaflet-route-info-box">${html}</div>`;
        container.style.display = "block";
      };
      return container;
    },
  });
  
  return new Control();
};