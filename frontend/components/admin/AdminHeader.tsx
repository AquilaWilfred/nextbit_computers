// components/admin/AdminHeader.tsx
import { Button } from "@/components/ui/button";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Bell, Menu, X } from "lucide-react";

interface AdminHeaderProps {
  activeTab: string;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  unreadCount: number;
}

export function AdminHeader({ activeTab, sidebarOpen, toggleSidebar, unreadCount }: AdminHeaderProps) {
  return (
    <header className="border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
        <h1 className="font-display text-2xl font-bold capitalize">{activeTab}</h1>
      </div>
      <div className="flex items-center gap-4">
        <AdminSearch />
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}