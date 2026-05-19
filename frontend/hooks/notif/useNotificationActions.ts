import { useCallback } from "react";
import { toast } from "sonner";
import { NotificationWithState } from "@/types/notif.types";

interface UseNotificationActionsProps {
  readIds: string[];
  setReadIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setDismissedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  activeNotifications: NotificationWithState[];
}

export function useNotificationActions({
  readIds,
  setReadIds,
  setDismissedIds,
  activeNotifications,
}: UseNotificationActionsProps) {
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [setReadIds]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const allIds = activeNotifications.map((n) => n.id);
      return Array.from(new Set([...prev, ...allIds]));
    });
    toast.success("All notifications marked as read");
  }, [activeNotifications, setReadIds]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  }, [setDismissedIds]);

  return {
    markAsRead,
    markAllAsRead,
    dismiss,
  };
}