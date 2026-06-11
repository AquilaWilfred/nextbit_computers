// hooks/nextbit-wallet/useApplicationActions.ts

import { useState, useCallback } from "react";
import { adminCardsService } from "@/lib/services/nextbit-wallet/admin.cards.service";
import { toast } from "sonner";

interface UseApplicationActionsProps {
  onSuccess?: () => void;
}

export function useApplicationActions({ onSuccess }: UseApplicationActionsProps = {}) {
  const [loading, setLoading] = useState<string | null>(null);

  const reviewApplication = useCallback(async (appId: string, action: "approved" | "rejected") => {
    setLoading(`app_${appId}`);
    try {
      await adminCardsService.reviewApplication(appId, action);
      toast.success(`Application ${action}`);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} application`);
    } finally {
      setLoading(null);
    }
  }, [onSuccess]);

  const isLoading = (appId: string) => loading === `app_${appId}`;

  return { reviewApplication, isLoading };
}