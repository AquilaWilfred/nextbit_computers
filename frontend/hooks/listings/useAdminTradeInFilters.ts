// hooks/listings/useAdminTradeInFilters.ts

import { useState, useCallback, useMemo } from 'react';
import { FilterState, SortBy, TradeInStatus, DeviceType } from '@/types/listings/admin.listings.types';

const initialFilters: FilterState = {
  status: "all",
  deviceType: "all",
  branch: "all",
  search: "",
  sortBy: "date",
};

export function useAdminTradeInFilters() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.status !== "all" || 
           filters.deviceType !== "all" || 
           filters.branch !== "all" || 
           filters.search !== "";
  }, [filters]);

  const setStatus = useCallback((status: "all" | TradeInStatus) => {
    updateFilter("status", status);
  }, [updateFilter]);

  const setDeviceType = useCallback((deviceType: "all" | DeviceType) => {
    updateFilter("deviceType", deviceType);
  }, [updateFilter]);

  const setBranch = useCallback((branch: string) => {
    updateFilter("branch", branch);
  }, [updateFilter]);

  const setSearch = useCallback((search: string) => {
    updateFilter("search", search);
  }, [updateFilter]);

  const setSortBy = useCallback((sortBy: SortBy) => {
    updateFilter("sortBy", sortBy);
  }, [updateFilter]);

  return {
    filters,
    setStatus,
    setDeviceType,
    setBranch,
    setSearch,
    setSortBy,
    resetFilters,
    hasActiveFilters,
  };
}