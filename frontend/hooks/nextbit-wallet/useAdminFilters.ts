// hooks/nextbit-wallet/useAdminFilters.ts

import { useState, useCallback, useMemo } from "react";
import { FilterState } from "@/types/nextbit-wallet/admin.cards.types";

export function useAdminFilters(initialTab: string = "overview") {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters = useMemo(() => {
    return search !== "" || statusFilter !== "all";
  }, [search, statusFilter]);

  return {
    search,
    statusFilter,
    setSearch,
    setStatusFilter,
    resetFilters,
    hasActiveFilters,
  };
}