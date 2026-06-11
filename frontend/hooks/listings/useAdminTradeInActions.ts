// hooks/listings/useAdminTradeInActions.ts

import { useState, useCallback } from 'react';
import { adminTradeInService } from '@/lib/services/listings/admin.listing.service';
import { TradeInStatus } from '@/types/listings/admin.listings.types';
import { toast } from 'sonner';

interface UseAdminTradeInActionsProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAdminTradeInActions({ onSuccess, onError }: UseAdminTradeInActionsProps = {}) {
  const [updating, setUpdating] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  const updateStatus = useCallback(async (
    id: number,
    status: TradeInStatus,
    creditAmount?: number,
    rejectionReason?: string
  ) => {
    setUpdating(true);
    setSelectedListingId(id);
    
    try {
      await adminTradeInService.updateStatus(id, {
        status,
        credit_amount: creditAmount,
        rejection_reason: rejectionReason,
      });
      
      toast.success(`Listing ${status === 'listed' ? 'approved' : status} successfully`);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update status');
      toast.error(error.message);
      onError?.(error);
    } finally {
      setUpdating(false);
      setSelectedListingId(null);
    }
  }, [onSuccess, onError]);

  const approveListing = useCallback((id: number) => {
    return updateStatus(id, 'listed');
  }, [updateStatus]);

  const rejectListing = useCallback((id: number, reason: string) => {
    return updateStatus(id, 'rejected', undefined, reason);
  }, [updateStatus]);

  const markAsSold = useCallback((id: number, creditAmount: number) => {
    return updateStatus(id, 'sold', creditAmount);
  }, [updateStatus]);

  const relistListing = useCallback((id: number) => {
    return updateStatus(id, 'listed');
  }, [updateStatus]);

  return {
    updating,
    selectedListingId,
    updateStatus,
    approveListing,
    rejectListing,
    markAsSold,
    relistListing,
  };
}