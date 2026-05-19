// hooks/useGeolocation.ts
import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserPosition = useCallback(async (showErrorToast = true) => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error("Geolocation is not available in this browser.");
        if (showErrorToast) toast.error(err.message);
        reject(err);
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      });
    });
  }, []);

  const getUserLocation = useCallback(async () => {
    setLoading(true);
    try {
      const position = await getUserPosition();
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setPosition(coords);
      setError(null);
      return coords;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getUserPosition]);

  return { position, loading, error, getUserLocation, getUserPosition };
}