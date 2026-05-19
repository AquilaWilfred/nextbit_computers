// components/map/types.ts
export interface MapMarker {
  id?: number;
  lat: number;
  lng: number;
  title?: string;
  name?: string;
  address?: string;
  phone?: string;
  hours?: Array<{ label: string; value: string }>;
  isMain?: boolean;
}

export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  showRouteTo: (lat: number, lng: number, origin?: { lat: number; lng: number }) => Promise<void>;
  clearRoute: () => void;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  geometry?: any;
}