// components/admin/TechnicianLayout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User, LayoutDashboard, Wrench, Bell, DollarSign, UserCircle } from "lucide-react";
import { AdminHeader } from "./AdminHeader";

interface TechnicianLayoutProps {
  children: React.ReactNode;
}

export default function TechnicianLayout({ children }: TechnicianLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((s) => !s);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Get active tab from URL or pathname
  const getActiveTab = () => {
    const tabParam = searchParams?.get("tab");
    if (tabParam) return tabParam;
    // Default to dashboard
    return "dashboard";
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [searchParams]);

  const NAV = [
    { key: "dashboard", label: "Dashboard", href: "/technician", icon: LayoutDashboard },
    { key: "requests", label: "Requests", href: "/technician?tab=requests", icon: Bell },
    { key: "jobs", label: "Jobs", href: "/technician?tab=jobs", icon: Wrench },
    { key: "earnings", label: "Earnings", href: "/technician?tab=earnings", icon: DollarSign },
    { key: "profile", label: "Profile", href: "/technician?tab=profile", icon: UserCircle },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-secondary border-r border-border transition-all duration-300 flex-col flex shrink-0`}>
        <div className="h-16 px-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
          {sidebarOpen && <span className="text-base font-bold truncate">Technician Portal</span>}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-border text-foreground hover:bg-accent transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-2" aria-label="Technician navigation">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = activeTab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => handleNavigation(n.href)}
                className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && n.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {sidebarOpen && (
            <div className="rounded-lg border border-border bg-card px-3 py-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Technician</p>
              <p className="text-sm font-bold truncate">Profile</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start px-3"
            onClick={() => {
              // Add logout logic here
              window.location.href = '/auth/logout';
            }}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader activeTab={activeTab} sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} unreadCount={0} />
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}