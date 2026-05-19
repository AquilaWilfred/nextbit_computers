"use client";
import { useState, useEffect } from "react";
import { Package } from "lucide-react";

interface AppearanceSettings {
  logoUrl?: string;
}

interface PublicSettings {
  appearance?: AppearanceSettings;
}

// ---------------------------------------------------------------------------
// Lightweight settings fetch with session-level cache.
// Mirrors the tRPC staleTime:Infinity behaviour — one fetch per tab session.
// ---------------------------------------------------------------------------

const CACHE_KEY = "settings_cache_appearance";

function useAppearanceSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    // Immediately hydrate from session cache to avoid layout shift
    if (typeof sessionStorage === "undefined") return null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: PublicSettings = JSON.parse(cached);
        return parsed.appearance?.logoUrl ?? null;
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  useEffect(() => {
    // If we already got the value from cache, skip the network call
    if (logoUrl !== null) return;

    fetch("/api/settings/public?keys=appearance")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json() as Promise<PublicSettings>;
      })
      .then((data) => {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          /* quota exceeded — ignore */
        }
        setLogoUrl(data.appearance?.logoUrl ?? null);
      })
      .catch(() => {
        // Non-fatal: fall back to icon
        setLogoUrl("");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return logoUrl;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StoreLoaderProps {
  fullScreen?: boolean;
}

export default function StoreLoader({ fullScreen = false }: StoreLoaderProps) {
  const logoUrl = useAppearanceSettings();

  const LoaderContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-muted border-t-[var(--brand)] animate-spin" />

        {/* Inner pulsing logo/icon */}
        <div className="animate-pulse flex items-center justify-center w-full h-full p-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Loading..."
              className="w-full h-full object-contain"
            />
          ) : (
            <Package className="w-8 h-8 text-[var(--brand)]" />
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
        Loading...
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        {LoaderContent}
      </div>
    );
  }

  return LoaderContent;
}