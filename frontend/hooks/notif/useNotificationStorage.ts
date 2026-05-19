import { useState, useEffect, useRef } from "react";
import { getReadIds, getDismissedIds, saveReadIds, saveDismissedIds } from "@/lib/utils/notif.utils";
import { STORAGE_EVENT } from "@/constants/notif.constants";

export function useNotificationStorage() {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const isInitialMount = useRef(true);
  const isUpdatingFromStorage = useRef(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    setReadIds(getReadIds());
    setDismissedIds(getDismissedIds());
  }, []);

  // Persist readIds changes - skip initial mount and storage updates
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isUpdatingFromStorage.current) return;
    saveReadIds(readIds);
  }, [readIds]);

  // Persist dismissedIds changes - skip initial mount and storage updates
  useEffect(() => {
    if (isInitialMount.current) return;
    if (isUpdatingFromStorage.current) return;
    saveDismissedIds(dismissedIds);
  }, [dismissedIds]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = () => {
      isUpdatingFromStorage.current = true;
      setReadIds(getReadIds());
      setDismissedIds(getDismissedIds());
      // Reset after state updates are processed
      setTimeout(() => {
        isUpdatingFromStorage.current = false;
      }, 0);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(STORAGE_EVENT, handleStorageChange);
    }
    
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(STORAGE_EVENT, handleStorageChange);
      }
    };
  }, []);

  return {
    readIds,
    dismissedIds,
    setReadIds,
    setDismissedIds,
  };
}