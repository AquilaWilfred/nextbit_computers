export const COOKIE_NAME = "auth_token";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const getLoginUrl = (redirect?: string, mode?: "register") => {
  const params = new URLSearchParams();
  if (redirect) params.set("redirect", redirect);
  if (mode) params.set("mode", mode);
  const query = params.toString();
  return `/auth${query ? `?${query}` : ""}`;
};

export const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };
export const ROUTE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316"];
export const BRAND_COLOR = "#6366f1";
