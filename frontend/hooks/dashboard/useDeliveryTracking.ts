import { useState, useEffect, useRef } from "react";

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
}

export function useDeliveryTracking(orderId: number, isActive: boolean) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${window.location.host}/ws/delivery/${orderId}`;

    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const loc = JSON.parse(event.data as string) as DriverLocation;
          if (!loc.lat || !loc.lng) return;
          setDriverLocation(loc);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        retryTimer = setTimeout(connect, 10000);
      };

      ws.onerror = () => {
        // silent — delivery WS is optional
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [orderId, isActive]);

  return driverLocation;
}