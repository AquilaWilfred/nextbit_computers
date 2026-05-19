// hooks/useFetch.ts (generic fetcher - move to global hooks if not exists)
import { useState, useEffect } from "react";

export function useFetch<T>(
  url: string,
  options?: { staleTime?: number; enabled?: boolean }
): { data: T | undefined; isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const staleTime = options?.staleTime ?? 0;
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const cacheKey = `rest_cache:${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (staleTime === Infinity || Date.now() - timestamp < staleTime) {
          setData(cachedData);
          setIsLoading(false);
          return;
        }
      } catch {
        /* ignore bad cache */
      }
    }

    let cancelled = false;
    setIsLoading(true);
    
    fetch(url, { headers: { "Content-Type": "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: json, timestamp: Date.now() }));
          } catch {
            /* storage full */
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, staleTime, enabled]);

  return { data, isLoading, error };
}