// hooks/listings/useAdminTradeInData.ts

import { useState, useEffect, useCallback } from 'react';
import { adminTradeInService } from '@/lib/services/listings/admin.listing.service';
import { AdminListing, AdminStats, FilterState } from '@/types/listings/admin.listings.types';
import { toast } from 'sonner';

export function useAdminTradeInData(filters: FilterState) {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, listingsData] = await Promise.all([
        adminTradeInService.getStats(),
        adminTradeInService.getListings({
          status: filters.status,
          device_type: filters.deviceType,
          branch: filters.branch,
          search: filters.search || undefined,
          sort_by: filters.sortBy,
        }),
      ]);
      
      setStats(statsData);
      setListings(listingsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    listings,
    stats,
    loading,
    error,
    refetch,
  };
}