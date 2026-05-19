// components/admin/AdminSidebar.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavigation";
import { User } from "@/types/admin";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  storeName: string;
  user: User | null;
  activeTab: string;
  onProfileClick: () => void;
  onLogout: () => void;
}

export function AdminSidebar({
  sidebarOpen,
  toggleSidebar,
  storeName,
  user,
  activeTab,
  onProfileClick,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } bg-secondary border-r border-border transition-all duration-300 flex-col flex shrink-0`}
    >
      {/* Header */}
      <div className="h-16 px-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
        {sidebarOpen && (
          <span className="text-base font-bold truncate flex-1">{storeName}</span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-border text-foreground hover:bg-accent transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-2" aria-label="Admin navigation">
        {ADMIN_NAV_ITEMS.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            {sidebarOpen && label}
          </Link>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Admin Profile Card */}
        {sidebarOpen && user && (
          <div className="rounded-lg border border-border bg-card px-3 py-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              Admin Profile
            </p>
            <p className="text-sm font-bold truncate">{user.name ?? user.email ?? "Admin"}</p>
          </div>
        )}

        {/* Edit Profile */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          {sidebarOpen && "Edit Profile"}
        </button>

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start px-3"
        >
          <LogOut className="w-4 h-4 mr-2 shrink-0" />
          {sidebarOpen && "Sign Out"}
        </Button>

        {/* Back to Store */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ChevronDown className="w-4 h-4 shrink-0 rotate-90" />
          {sidebarOpen && "Back to Store"}
        </Link>
      </div>
    </aside>
  );
}