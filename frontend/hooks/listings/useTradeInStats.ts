import { useState, useEffect, useCallback } from 'react';
import { UserStats } from '@/types/listings/listings.types';
import { tradeInService } from '@/lib/services/listings/listing.service';
import { toast } from 'sonner';

export function useTradeInStats(skip = false) {
  const [stats, setStats] = useState<UserStats>({
    total_listings: 0,
    active_listings: 0,
    sold_listings: 0,
    total_credit_earned: 0,
    total_views: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tradeInService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load stats'));
      toast.error('Failed to load your stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
      if (skip) return;
    loadStats();
  }, [loadStats]);

  const refetch = useCallback(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refetch };
}