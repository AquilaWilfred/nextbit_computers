export const COOKIE_NAME = "auth_token";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function normalizeRedirectPath(redirect?: string): string | undefined {
  if (!redirect) return undefined;
  const trimmed = redirect.trim();
  if (!trimmed || !trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("/auth")) return undefined;

  const sanitized = trimmed.replace(/[^A-Za-z0-9\-._~\/?#\[\]@!$&'()*+,;=%]/g, "");
  return sanitized || undefined;
}

export const getLoginUrl = (redirect?: string, mode?: "register") => {
  const params = new URLSearchParams();
  const safeRedirect = normalizeRedirectPath(redirect);
  if (safeRedirect) params.set("redirect", safeRedirect);
  if (mode) params.set("mode", mode);
  const query = params.toString();
  return `/auth${query ? `?${query}` : ""}`;
};

export const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };
export const ROUTE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316"];
export const BRAND_COLOR = "#6366f1";
