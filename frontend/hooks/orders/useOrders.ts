import { useState, useEffect, useCallback, useRef } from "react";
import { Order } from "@/types/orders.types";
import { apiFetch } from "@/lib/utils/order.utils";
import { POLLING_INTERVAL } from "@/constants/orders.constants";

export function useOrders(search: string, statusFilter: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const data = await apiFetch<Order[]>(`/api/admin/orders?${params}`);
      setOrders(data);
    } catch (error) {
      // silently keep stale data on poll failures
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // Polling
  useEffect(() => {
    pollingRef.current = setInterval(fetchOrders, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchOrders]);

  const updateOrderOptimistically = useCallback((orderId: number, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
  }, []);

  const refetch = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    updateOrderOptimistically,
    refetch,
  };
}