// utils/mapStyles.ts
import { LEAFLET_CSS_URL } from "../../constants/mapConstants";

export const injectMapStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("leaflet-custom-map-styles")) return;
  
  const style = document.createElement("style");
  style.id = "leaflet-custom-map-styles";
  style.textContent = `
    .leaflet-user-dot {
      width: 14px;
      height: 14px;
      border: 3px solid #fff;
      border-radius: 999px;
      background: #2563eb;
      box-shadow: 0 0 0 0 rgba(37,99,235,0.45);
      animation: leaflet-user-pulse 1.8s ease-out infinite;
    }
    @keyframes leaflet-user-pulse {
      0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(37,99,235,0.45); }
      70% { transform: scale(2.5); opacity: 0; box-shadow: 0 0 0 8px rgba(37,99,235,0); }
      100% { transform: scale(2.5); opacity: 0; box-shadow: 0 0 0 8px rgba(37,99,235,0); }
    }
    .leaflet-recenter-button,
    .leaflet-all-routes-button {
      width: 38px;
      height: 38px;
      border: none;
      border-radius: 999px;
      background: #fff;
      color: #111;
      box-shadow: 0 8px 20px rgba(15,23,42,0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      margin: 4px;
    }
    .leaflet-all-routes-button {
      width: auto;
      min-width: 120px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .leaflet-route-info-box {
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(15,23,42,0.08);
      border-radius: 14px;
      box-shadow: 0 12px 30px rgba(15,23,42,0.12);
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.4;
      color: #111;
      max-width: 240px;
    }
    .leaflet-admin-pin {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #6366f1;
      border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(99,102,241,0.15);
    }
  `;
  document.head.appendChild(style);
};

export const ensureLeafletCSS = () => {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;
  document.head.appendChild(link);
};