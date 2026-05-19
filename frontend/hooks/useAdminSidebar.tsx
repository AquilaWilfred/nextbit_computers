// hooks/useAdminSidebar.ts
import { useState, useEffect } from "react";

export function useAdminSidebar(initialState: boolean = true) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof localStorage === "undefined") return initialState;
    try {
      const saved = localStorage.getItem("admin_sidebar_open");
      return saved === null ? initialState : saved === "true";
    } catch {
      return initialState;
    }
  });

  // Persist sidebar state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("admin_sidebar_open", String(sidebarOpen));
    } catch {
      // Silently fail if localStorage not available
    }
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return { sidebarOpen, toggleSidebar, closeSidebar, openSidebar, setSidebarOpen };
}