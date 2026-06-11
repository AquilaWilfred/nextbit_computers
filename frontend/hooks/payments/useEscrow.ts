import { useState, useEffect, useCallback, useRef } from "react";
import { EscrowRecord } from "@/types/pay.types";

const ESCROW_POLLING_INTERVAL = 5000; // 5 seconds

interface UseEscrowOptions {
  escrowId?: string;
  enabled?: boolean;
  onStateChange?: (escrow: EscrowRecord) => void;
}

export function useEscrow(options: UseEscrowOptions = {}) {
  const { escrowId, enabled = true, onStateChange } = options;
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStateRef = useRef<string | null>(null);

  const fetchEscrow = useCallback(async () => {
    if (!escrowId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/escrow/${escrowId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EscrowRecord = await res.json();
      setEscrow(data);
      setError(null);

      if (lastStateRef.current && lastStateRef.current !== data.state) {
        onStateChange?.(data);
      }
      lastStateRef.current = data.state;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch escrow"));
    } finally {
      setIsLoading(false);
    }
  }, [escrowId, onStateChange]);

  useEffect(() => {
    if (enabled) fetchEscrow();
  }, [enabled, fetchEscrow]);

  useEffect(() => {
    if (!enabled || !escrowId) return;
    pollingRef.current = setInterval(fetchEscrow, ESCROW_POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [enabled, escrowId, fetchEscrow]);

  const refetch = useCallback(() => fetchEscrow(), [fetchEscrow]);

  // Buyer confirms they received the item
  // Transitions: funds_held_in_escrow -> delivery_confirmed
  const confirmDelivery = useCallback(async () => {
    if (!escrowId) throw new Error("No escrow ID");
    const res = await fetch(`/api/escrow/${escrowId}/confirm-delivery`, {
      method: "POST",
      credentials: "include",
    });
    let data: EscrowRecord;
    try {
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to confirm delivery");
      }
      data = await res.json();
    } catch (err) {
      if (err instanceof Error && err.message.includes("Failed to confirm")) {
        throw err;
      }
      throw new Error("Failed to confirm delivery");
    }
    setEscrow(data);
    onStateChange?.(data);
    return data;
  }, [escrowId, onStateChange]);

  // Admin/system triggers seller payout after delivery confirmed or ruling
  // Transitions: delivery_confirmed -> released_to_seller -> payout_completed
  const release = useCallback(async (sellerPhone: string) => {
    if (!escrowId) throw new Error("No escrow ID");
    const res = await fetch(`/api/escrow/${escrowId}/release`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_phone: sellerPhone }),
    });
    let data: any;
    try {
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to release escrow");
      }
      data = await res.json();
    } catch (err) {
      if (err instanceof Error && err.message.includes("Failed to release")) {
        throw err;
      }
      throw new Error("Failed to release escrow");
    }
    setEscrow((prev) => prev ? { ...prev, state: "released_to_seller" } : prev);
    return data;
  }, [escrowId]);

  // Helpers for UI rendering
  const isPending    = escrow?.state === "payment_pending";
  const isFundsHeld  = escrow?.state === "funds_held_in_escrow";
  const isDelivered  = escrow?.state === "delivery_confirmed";
  const isPaidOut    = escrow?.state === "payout_completed";
  const isDisputed   = escrow?.state === "dispute_raised";
  const isRefunded   = escrow?.state === "refunded";

  return {
    escrow,
    isLoading,
    error,
    refetch,
    confirmDelivery,
    release,
    // state helpers
    isPending,
    isFundsHeld,
    isDelivered,
    isPaidOut,
    isDisputed,
    isRefunded,
  };
}