"use client";

import { useState, useCallback, useRef } from "react";

export interface DeliveryPin {
  lat: number;
  lng: number;
  address: string; // human-readable from reverse geocode
  city?: string;
  county?: string;
  country?: string;
  postalCode?: string;
}

interface NominatimResult {
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

// Build a short, human-friendly label from Nominatim result
function formatAddress(result: NominatimResult): Omit<DeliveryPin, "lat" | "lng"> {
  const a = result.address;
  const labelParts = [
    a.road,
    a.neighbourhood || a.suburb,
    a.city || a.town || a.county,
  ].filter(Boolean);

  return {
    address: labelParts.length > 0 ? labelParts.join(", ") : result.display_name,
    city: a.city || a.town || a.county,
    county: a.county,
    country: a.country,
    postalCode: a.postcode,
  };
}

export function useDeliveryPin() {
  const [pin, setPin] = useState<DeliveryPin | null>(null);
  const [resolving, setResolving] = useState(false); // reverse geocode in-flight
  const [locating, setLocating] = useState(false);   // GPS in-flight
  const abortRef = useRef<AbortController | null>(null);

  // Reverse geocode lat/lng → address string via Nominatim (no API key needed)
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Omit<DeliveryPin, "lat" | "lng">> => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          signal: abortRef.current.signal,
          headers: { "Accept-Language": "en" },
        }
      );
      if (!res.ok) {
        return {
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          city: undefined,
          county: undefined,
          country: undefined,
          postalCode: undefined,
        };
      }
      const data: NominatimResult = await res.json();
      return formatAddress(data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          address: pin?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          city: pin?.city,
          county: pin?.county,
          country: pin?.country,
          postalCode: pin?.postalCode,
        };
      }
      return {
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: undefined,
        county: undefined,
        country: undefined,
        postalCode: undefined,
      };
    }
  }, [pin?.address, pin?.city, pin?.county, pin?.country, pin?.postalCode]);

  const onMapMoveEnd = useCallback(async (lat: number, lng: number) => {
    setResolving(true);
    const result = await reverseGeocode(lat, lng);
    setPin({ lat, lng, ...result });
    setResolving(false);
  }, [reverseGeocode]);

  // "Use my location" — GPS → reverse geocode
  const locateMe = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) return null;
    setLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setLocating(false);
          resolve({ lat, lng });
        },
        () => {
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }, []);

  const clearPin = useCallback(() => setPin(null), []);

  return { pin, setPin, resolving, locating, onMapMoveEnd, locateMe, clearPin };
}