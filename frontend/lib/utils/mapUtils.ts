// utils/mapUtils.ts
export const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`;
export const formatDuration = (seconds: number) => `${Math.round(seconds / 60)} min`;

export const getCityFromAddress = (address?: string) => {
  if (!address) return undefined;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  return parts.length > 1 ? parts[parts.length - 2] || parts[parts.length - 1] : parts[0];
};

export const isValidCoordinates = (lat?: number, lng?: number) => {
  return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
};