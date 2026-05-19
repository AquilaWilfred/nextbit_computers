// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";
import { Notification } from "@/types/admin";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // Silently fail for background polling
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds - replace with WebSocket/SSE when available
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, unreadCount, refetch: fetchNotifications };
}