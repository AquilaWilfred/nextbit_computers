// hooks/nextbit-wallet/useTransactionActions.ts

import { useState, useCallback } from "react";
import { adminCardsService } from "@/lib/services/nextbit-wallet/admin.cards.service";
import { toast } from "sonner";

interface UseTransactionActionsProps {
  onSuccess?: () => void;
}

export function useTransactionActions({ onSuccess }: UseTransactionActionsProps = {}) {
  const [loading, setLoading] = useState<string | null>(null);

  const clearFlag = useCallback(async (txId: string) => {
    setLoading(`tx_${txId}`);
    try {
      await adminCardsService.clearTransactionFlag(txId);
      toast.success("Transaction flag cleared");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear flag");
    } finally {
      setLoading(null);
    }
  }, [onSuccess]);

  const isLoading = (txId: string) => loading === `tx_${txId}`;

  return { clearFlag, isLoading };
}