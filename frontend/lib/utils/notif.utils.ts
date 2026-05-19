import { STORAGE_KEYS, STORAGE_EVENT } from "@/constants/notif.constants";
import { Notification, NotificationWithState } from "@/types/notif.types";

export function readLocalStorage(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function writeLocalStorage(key: string, value: string[]): void {
  if (typeof window === "undefined") return;
  
  const oldValue = localStorage.getItem(key);
  const newValue = JSON.stringify(value);
  
  // Only dispatch if value actually changed to prevent infinite loops
  if (oldValue !== newValue) {
    localStorage.setItem(key, newValue);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

export function getReadIds(): string[] {
  return readLocalStorage(STORAGE_KEYS.READ);
}

export function getDismissedIds(): string[] {
  return readLocalStorage(STORAGE_KEYS.DISMISSED);
}

export function saveReadIds(ids: string[]): void {
  writeLocalStorage(STORAGE_KEYS.READ, ids);
}

export function saveDismissedIds(ids: string[]): void {
  writeLocalStorage(STORAGE_KEYS.DISMISSED, ids);
}

export function getActiveNotifications(
  notifications: Notification[],
  dismissedIds: string[],
  readIds: string[]
): NotificationWithState[] {
  return notifications
    .filter((n) => !dismissedIds.includes(n.id))
    .map((n) => ({ ...n, isRead: readIds.includes(n.id) }));
}