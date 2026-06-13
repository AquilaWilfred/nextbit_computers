import { useState, useEffect } from "react";

export function useAdminSidebar(initialState: boolean = true) {
  // Always start with initialState (SSR-safe), hydrate from localStorage after mount
  const [sidebarOpen, setSidebarOpen] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_open");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("admin_sidebar_open", String(sidebarOpen));
    } catch {
      // ignore
    }
  }, [sidebarOpen, hydrated]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return { sidebarOpen, toggleSidebar, closeSidebar, openSidebar, setSidebarOpen };
}