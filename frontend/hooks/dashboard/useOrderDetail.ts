import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { OrderDetail } from "@/types/dashboard/dashboard.types";

const CACHE_PREFIX = "order_detail_cache_";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes — orders change more often than the list

interface CacheEntry {
  data: OrderDetail;
  timestamp: number;
}

function readCache(orderId: number): CacheEntry | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${orderId}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_PREFIX}${orderId}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(orderId: number, data: OrderDetail) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(`${CACHE_PREFIX}${orderId}`, JSON.stringify(entry));
  } catch {
    // silent fail
  }
}

export function useOrderDetail(orderId?: number) {
  const validOrderId = typeof orderId === "number" && Number.isInteger(orderId) && orderId > 0;
  const cached = validOrderId ? readCache(orderId!) : null;

  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(cached?.data ?? null);
  const [isLoading, setIsLoading] = useState(validOrderId && !cached); // skip skeleton if cached
  const [error, setError] = useState<Error | null>(null);
  const isFetchingRef = useRef(false);

  const fetchOrderDetail = useCallback(async (silent = false) => {
    if (!validOrderId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setIsLoading(true);

    try {
      const data = await dashboardService.getOrderDetail(orderId!);
      setOrderDetail(data);
      setError(null);
      writeCache(orderId!, data);
    } catch (err) {
      setError(err as Error);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, [orderId, validOrderId]);

  useEffect(() => {
    if (!validOrderId) {
      setOrderDetail(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If cached, refresh silently in background; otherwise show loading
    fetchOrderDetail(!!cached);

    // 30s is enough — order status doesn't change every 5 seconds
    const interval = setInterval(() => fetchOrderDetail(true), 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return { orderDetail, isLoading, error, refetch: () => fetchOrderDetail(false) };
}