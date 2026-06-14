// hooks/usePublicSettings.ts
import { useState, useEffect } from "react";
import { PublicSettings } from "@/types/admin";

// Module-level cache — shared across ALL hook instances, survives re-renders
const _memCache = new Map<string, PublicSettings>();
const _inflight = new Map<string, Promise<PublicSettings>>();

async function fetchSettings(keys: string[]): Promise<PublicSettings> {
  const cacheKey = [...keys].sort().join("_");

  // 1. Memory cache (instant)
  if (_memCache.has(cacheKey)) return _memCache.get(cacheKey)!;

  // 2. Session storage (fast, survives navigation)
  try {
    const cached = sessionStorage.getItem(`settings_${cacheKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      _memCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  // 3. Deduplicated network request — if already in-flight, wait on same promise
  if (_inflight.has(cacheKey)) return _inflight.get(cacheKey)!;

  const params = new URLSearchParams();
  keys.forEach((k) => params.append("keys", k));

  const promise = fetch(`/api/settings/public?${params.toString()}`)
    .then((r) => r.json())
    .then((json: PublicSettings) => {
      _memCache.set(cacheKey, json);
      try { sessionStorage.setItem(`settings_${cacheKey}`, JSON.stringify(json)); } catch {}
      _inflight.delete(cacheKey);
      return json;
    })
    .catch((err) => {
      _inflight.delete(cacheKey);
      throw err;
    });

  _inflight.set(cacheKey, promise);
  return promise;
}

export function usePublicSettings(keys: string[]) {
  const cacheKey = [...keys].sort().join("_");
  const memHit = _memCache.get(cacheKey);

  const [data, setData] = useState<PublicSettings | null>(memHit ?? null);
  const [loading, setLoading] = useState(!memHit);

  useEffect(() => {
    if (memHit) return; // already have it — no fetch needed
    let mounted = true;
    fetchSettings(keys)
      .then((json) => { if (mounted) { setData(json); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [cacheKey]);

  return { data, loading };
}
