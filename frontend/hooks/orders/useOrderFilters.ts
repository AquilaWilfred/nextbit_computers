import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";
import { ITEMS_PER_PAGE_OPTIONS, DEFAULT_ITEMS_PER_PAGE } from "@/constants/orders.constants";

export function useOrderFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, itemsPerPage]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    resetFilters,
  };
}