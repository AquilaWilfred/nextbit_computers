// hooks/usePublicSettings.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PublicSettings } from "@/types/admin";

export function usePublicSettings(keys: string[]) {
  const [data, setData] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Serialize keys for stable dependency comparison
  const keysKey = keys.join("_");

  useEffect(() => {
    let mounted = true;
    const cacheKey = `settings_cache_${keysKey}`;
    
    // Check cache first
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setData(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        /* ignore parse errors */
      }
    }

    const params = new URLSearchParams();
    keys.forEach((k) => params.append("keys", k));

    fetch(`/api/settings/public?${params.toString()}`)
      .then((r) => r.json())
      .then((json: PublicSettings) => {
        if (mounted) {
          setData(json);
          sessionStorage.setItem(cacheKey, JSON.stringify(json));
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          toast.error("Failed to load settings");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [keysKey]);

  return { data, loading };
}