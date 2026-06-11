// hooks/nextbit-wallet/useCardActions.ts

import { useState, useCallback } from "react";
import { adminCardsService } from "@/lib/services/nextbit-wallet/admin.cards.service";
import { CardRecord, CardStatus } from "@/types/nextbit-wallet/admin.cards.types";
import { toast } from "sonner";

interface UseCardActionsProps {
  onSuccess?: () => void;
}

export function useCardActions({ onSuccess }: UseCardActionsProps = {}) {
  const [loading, setLoading] = useState<string | null>(null);

  const toggleFreeze = useCallback(async (cardId: string, currentStatus: string) => {
    const newStatus = currentStatus === "frozen" ? "active" : "frozen";
    setLoading(`freeze_${cardId}`);
    try {
      await adminCardsService.updateCardStatus(cardId, newStatus);
      toast.success(`Card ${newStatus === "active" ? "activated" : "frozen"} successfully`);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update card status");
    } finally {
      setLoading(null);
    }
  }, [onSuccess]);

  const cancelCard = useCallback(async (cardId: string) => {
    if (!confirm("Are you sure you want to cancel this card?")) return;
    setLoading(`cancel_${cardId}`);
    try {
      await adminCardsService.updateCardStatus(cardId, "cancelled");
      toast.success("Card cancelled successfully");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel card");
    } finally {
      setLoading(null);
    }
  }, [onSuccess]);

  const isLoading = (cardId: string, action: string) => loading === `${action}_${cardId}`;

  return { toggleFreeze, cancelCard, isLoading };
}