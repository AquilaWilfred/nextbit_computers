import { useState, useEffect, useCallback, useRef } from "react";
import { Notification } from "@/types/notif.types";
import { POLL_INTERVAL } from "@/constants/notif.constants";

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/admin/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const json = await res.json();
  return Array.isArray(json) ? json : json.notifications ?? [];
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return {
    notifications,
    isLoading,
    error,
    refetch,
  };
}