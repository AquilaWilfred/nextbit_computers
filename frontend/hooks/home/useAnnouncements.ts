// hooks/useAnnouncements.ts
import { useState, useEffect, useRef } from "react";
import { useFetch } from "./useFetch";
import { Announcement } from "@/types/home.types";
import { WS_PORT } from "@/constants/homeConstants";

export function useAnnouncements(fallbackUrl: string) {
  const [announcements, setAnnouncements] = useState<Announcement[] | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  
  const { data: restData, isLoading: restLoading } = useFetch<Announcement[]>(fallbackUrl, {
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (restData !== undefined) {
      setAnnouncements(restData);
    }
  }, [restData, restLoading]);

  // WebSocket for live updates
  useEffect(() => {
    if (typeof window === "undefined" || !WS_PORT) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.hostname}:${WS_PORT}/api/ws/announcements`;

    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;
    let didOpen = false;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          didOpen = true;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "announcements" && Array.isArray(msg.data)) {
              setAnnouncements(msg.data as Announcement[]);
            }
          } catch {
            /* ignore bad messages */
          }
        };

        ws.onclose = () => {
          if (didOpen) {
            didOpen = false;
            retryTimer = setTimeout(connect, 30_000);
          }
        };
      } catch {
        /* WS not available */
      }
    };

    connect();

    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  return { data: announcements, isLoading: restLoading };
}