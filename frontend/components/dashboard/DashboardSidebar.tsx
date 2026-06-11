import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/constants/dashboard/dashboard.constants";
import { DashboardTab } from "@/types/dashboard/dashboard.types";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export function DashboardSidebar({ activeTab, userName, userEmail, onLogout }: DashboardSidebarProps) {
  return (
    <aside className="lg:col-span-1" aria-label="Dashboard navigation">
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center" aria-hidden="true">
            <span className="font-display font-bold text-[var(--brand)]">
              {userName?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{userName ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <nav>
          <ul className="space-y-1">
            {DASHBOARD_NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === item.id
                        ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={activeTab === item.id ? "page" : undefined}
                  >
                    <item.icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </div>
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}