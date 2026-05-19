import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Customer } from "@/types/customers.types";

export function useCustomers(search: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCustomers = useCallback(async (query: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/admin/customers${params}`, {
        signal: abortRef.current.signal,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Customer[] = await res.json();
      setCustomers(data);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Failed to load customers");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/admin/customers/ws`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as
          | { type: "upsert"; customer: Customer }
          | { type: "delete"; id: string }
          | { type: "ping" };

        if (msg.type === "upsert") {
          setCustomers((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.customer.id);
            if (idx === -1) return [msg.customer, ...prev];
            const next = [...prev];
            next[idx] = msg.customer;
            return next;
          });
        } else if (msg.type === "delete") {
          setCustomers((prev) => prev.filter((c) => c.id !== msg.id));
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
      abortRef.current?.abort();
    };
  }, []);

  // Refetch when search changes
  useEffect(() => {
    fetchCustomers(search);
  }, [search, fetchCustomers]);

  const refetch = useCallback(() => {
    fetchCustomers(search);
  }, [fetchCustomers, search]);

  return {
    customers,
    isLoading,
    wsConnected,
    refetch,
  };
}