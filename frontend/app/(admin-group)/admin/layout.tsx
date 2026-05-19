// app/admin/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AIWorkflowProvider } from "@/contexts/AIWorkflowContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { usePathname } from "next/navigation";

function getActiveTabFromPath(pathname: string): string {
  const segments = pathname.split("/");
  // Handle cases like /admin/b2b/application -> returns "b2b"
  if (segments[2] === "b2b") return "b2b";
  return segments[segments.length - 1] || "dashboard";
}

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTabFromPath(pathname);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/admin/dashboard");
    } else if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) return null;
  if (!user || user.role !== "admin") return null;

  return (
    <AIWorkflowProvider>
      <AdminLayout activeTab={activeTab}>
        {children}
      </AdminLayout>
    </AIWorkflowProvider>
  );
}