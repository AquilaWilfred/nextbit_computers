import { useState, useEffect, useCallback, useRef } from "react";
import { PayoutRequest } from "@/types/pay.types";
import { POLLING_INTERVAL } from "@/constants/pay.constants";
import { apiFetch } from "@/lib/utils/pay.utils";

export function usePayouts() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPayouts = useCallback(async () => {
    try {
      const data = await apiFetch<PayoutRequest[]>("/api/admin/payments/payout-requests");
      setPayouts(data);
    } catch (error) {
      // retain stale on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  useEffect(() => {
    pollingRef.current = setInterval(fetchPayouts, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchPayouts]);

  const updatePayoutOptimistically = useCallback((id: number, updates: Partial<PayoutRequest>) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const refetch = useCallback(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  return {
    payouts,
    isLoading,
    updatePayoutOptimistically,
    refetch,
  };
}