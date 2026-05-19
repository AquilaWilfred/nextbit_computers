import { useState, useEffect, useCallback, useRef } from "react";
import { AnalyticsData, RangeValue } from "@/types/network/analytics.types";

export function useNetworkAnalytics(range: RangeValue) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/analytics/network?range_days=${range}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch network analytics");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, loading, refreshing, refresh };
}