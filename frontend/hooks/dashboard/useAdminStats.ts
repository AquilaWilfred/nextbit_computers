import { useState, useEffect, useCallback, useRef } from "react";
import { AdminStats, TimeRange } from "@/types/dashboard.types";

const POLLING_INTERVAL = 30000; // 30 seconds

export function useAdminStats(timeRange: TimeRange) {
  const [data, setData] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    try {
      const res = await fetch(`/api/admin/stats?timeRange=${timeRange}`, {
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json: AdminStats = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setIsLoading(true);
    fetchStats();
    
    intervalRef.current = setInterval(fetchStats, POLLING_INTERVAL);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, isLoading, error, refetch };
}