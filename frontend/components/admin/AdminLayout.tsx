// components/admin/AdminLayout.tsx 
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { ProfileModal } from "./ProfileModal";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdminSidebar } from "@/hooks/useAdminSidebar";
import { AdminLayoutContentProps } from "@/types/admin";

export default function AdminLayout({ children, activeTab = "dashboard" }: AdminLayoutContentProps) {
  const { logout, user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAdminSidebar(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: settings } = usePublicSettings(["appearance", "general"]);
  
  const storeName = settings?.general?.storeName ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("store_name_cache") : null) ||
    "Admin";
  
  const logoUrl = settings?.appearance?.logoUrl ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("store_logo_cache") : null);

  useEffect(() => {
    if (settings?.general?.storeName)
      localStorage.setItem("store_name_cache", settings.general.storeName);
    if (settings?.appearance?.logoUrl)
      localStorage.setItem("store_logo_cache", settings.appearance.logoUrl);
  }, [settings]);

  const { unreadCount } = useNotifications();
  const handleLogout = () => logout();
  const handleProfileClick = () => setProfileModalOpen(true);
  const handleProfileUpdate = () => {};

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        storeName={storeName}
        user={user}
        activeTab={activeTab}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        disableTransition={!mounted}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          activeTab={activeTab}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          unreadCount={unreadCount}
        />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}