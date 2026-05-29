
import { useState, useCallback } from 'react';
import { cardsService } from '@/lib/services/nextbit-wallet/cards.service';
import { VirtualCard, VirtualCardStatus } from '@/types/nextbit-wallet/cards.types';
import { toast } from 'sonner';

interface UseCardFreezeProps {
  virtualCard: VirtualCard | null;
  onStatusChange?: (newStatus: VirtualCardStatus) => void;
}

export function useCardFreeze({ virtualCard, onStatusChange }: UseCardFreezeProps) {
  const [toggling, setToggling] = useState(false);

  const toggleFreeze = useCallback(async () => {
    if (!virtualCard) return;

    setToggling(true);
    try {
      const newStatus = virtualCard.status === "active" ? "frozen" : "active";
      await cardsService.toggleCardFreeze(newStatus === "frozen");
      
      toast.success(`Card ${newStatus === "active" ? "activated" : "frozen"} successfully`);
      onStatusChange?.(newStatus);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to toggle card status");
      toast.error(error.message);
    } finally {
      setToggling(false);
    }
  }, [virtualCard, onStatusChange]);

  return {
    toggling,
    toggleFreeze,
  };
}