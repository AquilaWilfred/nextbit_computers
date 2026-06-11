import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { Order, DashboardStats } from "@/types/dashboard/dashboard.types";

const CACHE_KEY = "dashboard_orders_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  orders: Order[];
  stats: DashboardStats;
  timestamp: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(orders: Order[], stats: DashboardStats) {
  try {
    const entry: CacheEntry = { orders, stats, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // storage full or unavailable — silent fail
  }
}

// Normalize dates coming from the API so they're always valid Date objects
function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((o) => ({
    ...o,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  totalSpent: 0,
};

export function useDashboardData() {
  const cached = readCache(); // read once — never causes re-render

  const [orders, setOrders] = useState<Order[]>(cached?.orders ?? []);
  const [stats, setStats] = useState<DashboardStats>(cached?.stats ?? EMPTY_STATS);
  // If we have a cache, skip the skeleton entirely
  const [isLoading, setIsLoading] = useState(!cached);
  const isFetchingRef = useRef(false); // prevents overlapping fetches

  const fetchOrders = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setIsLoading(true);

    try {
      const raw = await dashboardService.getOrders();
      const data = normalizeOrders(raw);
      const newStats = dashboardService.calculateStats(data);
      setOrders(data);
      setStats(newStats);
      writeCache(data, newStats);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we had a cache, fetch silently in the background to freshen it
    // If no cache, fetch normally (skeleton shows)
    fetchOrders(!!cached);

    // Poll silently — user never sees a flash
    const interval = setInterval(() => fetchOrders(true), 30_000); // 30s is plenty; 10s was too aggressive
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { orders, isLoading, stats, refetch: () => fetchOrders(false) };
}