import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { proxyClient } from "@/lib/api-client";
import {
  TechnicianProfile,
  IncomingRequest,
  ActiveJob,
  CompletedJob,
  Earnings,
} from "@/types/technician.types";

const CACHE_DURATION = 5 * 60 * 1000;
const AUTO_REFRESH_INTERVAL = 5 * 1000; // 30 seconds — silent background refresh

interface TechnicianData {
  profile: TechnicianProfile | null;
  incoming: IncomingRequest[];
  jobs: ActiveJob[];
  allJobs: ActiveJob[];
  completed: CompletedJob[];
  earnings: Earnings | null;
}

interface TechnicianDataState extends TechnicianData {
  loading: boolean;
  error: string | null;
  isTechnician: boolean;
  refresh: () => void;
  refreshing: boolean;
  setOptimistic: (updater: (prev: any) => any) => void;
}

interface DashboardPayload {
  profile: TechnicianProfile | null;
  incoming: IncomingRequest[];
  jobs: ActiveJob[];
  completed: CompletedJob[];
  earnings: Earnings | null;
}

export function useTechnicianData(): TechnicianDataState {
  const { user } = useAuth();
  const [data, setData] = useState<TechnicianData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticData, setOptimisticData] = useState<TechnicianData | null>(null);

  const cacheRef = useRef<{ data: TechnicianData; timestamp: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const loadData = useCallback(async (forceRefresh = false, silent = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (!silent) {
      if (!data) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const result = await proxyClient.get<DashboardPayload>(
        `/api/technician/dashboard-data?user_id=${user.id}&_=${Date.now()}`
      );

      const shaped: TechnicianData = {
        profile:   result.profile   ?? null,
        incoming:  result.incoming  ?? [],
        jobs:      result.jobs      ?? [],
        allJobs:   result.jobs      ?? [],
        completed: result.completed ?? [],
        earnings:  result.earnings  ?? null,
      };

      cacheRef.current = { data: shaped, timestamp: Date.now() };

      if (isMountedRef.current) setData(shaped);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      console.error("useTechnicianData:", err);
      if (!silent) {
        setError(message);
        toast.error("Failed to load dashboard data");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id, data]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    if (cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < CACHE_DURATION) {
        setData(cacheRef.current.data);
        setLoading(false);
        return;
      }
    }

    loadData(false, false);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  // Silent background auto-refresh every 30 seconds
  useEffect(() => {
    if (!user?.id || !data?.profile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      loadData(true, true); // silent = true — no loading state, no toast
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, data?.profile, loadData]);

  // Reset optimistic data when real data arrives
  useEffect(() => {
    setOptimisticData(null);
  }, [data]);

  const resolved = optimisticData ?? data;

  const refresh = useCallback(() => {
    loadData(true, false);
  }, [loadData]);

  const TERMINAL = ["declined", "cancelled"];
  const activeJobs = (resolved?.jobs ?? []).filter(
    (j) => !TERMINAL.includes(j.status)
  );

  return {
    profile:      resolved?.profile   ?? null,
    incoming:     resolved?.incoming  ?? [],
    jobs:         activeJobs,
    allJobs:      resolved?.allJobs   ?? [],
    completed:    resolved?.completed ?? [],
    earnings:     resolved?.earnings  ?? null,
    refreshing,
    loading,
    error,
    isTechnician: !!resolved?.profile,
    refresh,
    setOptimistic: (updater) => {
      setOptimisticData((prev) => {
        const base = prev ?? data ?? {
          profile: null,
          incoming: [],
          jobs: [],
          allJobs: [],
          completed: [],
          earnings: null,
        };
        return updater(base);
      });
    },
  };
}