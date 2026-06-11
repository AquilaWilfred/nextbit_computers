// hooks/nextbit-wallet/useKycActions.ts

import { useState, useCallback } from "react";
import { adminCardsService } from "@/lib/services/nextbit-wallet/admin.cards.service";
import { KycStatus } from "@/types/nextbit-wallet/admin.cards.types";
import { toast } from "sonner";

interface UseKycActionsProps {
  onSuccess?: () => void;
}

export function useKycActions({ onSuccess }: UseKycActionsProps = {}) {
  const [loading, setLoading] = useState<string | null>(null);

  const updateKyc = useCallback(async (holderId: string, status: KycStatus) => {
    setLoading(`kyc_${holderId}`);
    try {
      await adminCardsService.updateKycStatus(holderId, status);
      toast.success(`KYC status updated to ${status}`);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update KYC status");
    } finally {
      setLoading(null);
    }
  }, [onSuccess]);

  const isLoading = (holderId: string) => loading === `kyc_${holderId}`;

  return { updateKyc, isLoading };
}