// components/map/MapMarker.tsx
import { BRAND_COLOR } from "@/constants/mapConstants";
import { MapMarker } from "./types";

interface MapMarkerOptions {
  branch: MapMarker;
  selected: boolean;
  L: any;
}

export const buildBranchIcon = (branch: MapMarker, selected: boolean = false, L: any) => {
  const color = branch.isMain ? BRAND_COLOR : "#fff";
  const textColor = branch.isMain ? "#fff" : "#111";
  const borderColor = branch.isMain ? BRAND_COLOR : "#334155";
  const label = branch.title || branch.name || "Branch";
  
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;white-space:nowrap;">
        <div style="padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;color:${textColor};background:${color};border:2px solid ${borderColor};box-shadow:0 10px 18px rgba(15,23,42,0.12);">${label}</div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${color};margin-top:-1px;"></div>
      </div>
    `,
    className: "branch-label-icon",
    iconSize: [label.length * 8 + 30, 44],
    iconAnchor: [((label.length * 8 + 30) / 2) | 0, 44],
    popupAnchor: [0, -40],
  });
};

export const buildUserMarkerIcon = (L: any) => {
  return L.divIcon({
    className: "leaflet-user-marker",
    html: `<div class="leaflet-user-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const buildPickerMarkerIcon = (L: any) => {
  return L.divIcon({
    className: "leaflet-admin-pin",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 0 0 4px rgba(99,102,241,0.15);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const buildPopupHtml = (
  branch: MapMarker, 
  formatDistance: (meters: number) => string,
  formatDuration: (seconds: number) => string,
  distance?: number, 
  duration?: number
) => {
  const hoursHtml = branch.hours?.length
    ? branch.hours.map((hour) => `<div><strong>${hour.label}:</strong> ${hour.value}</div>`).join("")
    : "<div>No schedule available</div>";
    
  return `
    <div class="leaflet-route-popup">
      <h4>${branch.title || branch.name || "Branch"}</h4>
      <div class="details">
        ${branch.address ? `<div><strong>Address:</strong> ${branch.address}</div>` : ""}
        ${branch.phone ? `<div><strong>Phone:</strong> ${branch.phone}</div>` : ""}
        ${hoursHtml}
        ${distance != null ? `<div><strong>Distance:</strong> ${formatDistance(distance)}</div>` : ""}
        ${duration != null ? `<div><strong>ETA:</strong> ${formatDuration(duration)}</div>` : ""}
        <a href="#" class="clear-route-btn" id="clear-route-${branch.id}">Clear Route</a>
      </div>
    </div>
  `;
};