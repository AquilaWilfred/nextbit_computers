"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";

// Routes under /b2b that don't require authentication
const PUBLIC_B2B_PATHS = ["/b2b", "/b2b/registration", "/b2b/login"];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath =
    pathname === "/b2b" ||
    pathname.startsWith("/b2b/registration") ||
    pathname.startsWith("/b2b/login");

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.replace("/auth?redirect=/b2b");
    }
  }, [user, loading, router, isPublicPath]);

  // Public paths render immediately without auth check
  if (isPublicPath) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
      </div>
    );
  }

  // Auth-required paths wait for auth to resolve
  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {children}
    </div>
  );
}
