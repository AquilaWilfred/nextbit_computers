import { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeInRequest, TradeInStatus } from '@/types/listings/listings.types';
import { tradeInService } from '@/lib/services/listing.service';
import { toast } from 'sonner';

export function useTradeInListings(initialStatus: string = 'all') {
  const [listings, setListings] = useState<TradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tradeInService.getListings(statusFilter === 'all' ? undefined : statusFilter);
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load listings'));
      toast.error('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const filteredListings = useMemo(() => {
    if (statusFilter === 'all') return listings;
    return listings.filter(r => r.status === statusFilter);
  }, [listings, statusFilter]);

  const counts = useMemo(() => ({
    total: listings.length,
    pending: listings.filter(r => r.status === 'pending_verification').length,
    active: listings.filter(r => r.status === 'listed').length,
    sold: listings.filter(r => r.status === 'sold').length,
    rejected: listings.filter(r => r.status === 'rejected').length,
  }), [listings]);

  const refetch = useCallback(() => {
    loadListings();
  }, [loadListings]);

  return {
    listings: filteredListings,
    allListings: listings,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    counts,
    refetch,
  };
}