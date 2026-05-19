import { useState, useEffect, useCallback, useRef } from "react";
import { Payment } from "@/types/pay.types";
import { POLLING_INTERVAL } from "@/constants/pay.constants";
import { apiFetch } from "@/lib/utils/pay.utils";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await apiFetch<Payment[]>("/api/admin/payments");
      setPayments(data);
    } catch (error) {
      // retain stale on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Polling
  useEffect(() => {
    pollingRef.current = setInterval(fetchPayments, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchPayments]);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT ?? "8001";
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:${wsPort}/api/ws/admin/stats`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "payment_update") {
            fetchPayments();
          }
        } catch {}
      };
      wsRef.current.onerror = () => {}; // fall back to polling
    } catch {}
    
    return () => {
      wsRef.current?.close();
    };
  }, [fetchPayments]);

  const refetch = useCallback(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    isLoading,
    refetch,
  };
}