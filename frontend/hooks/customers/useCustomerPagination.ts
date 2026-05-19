import { useState, useMemo, useEffect } from "react";
import { DEFAULT_ITEMS_PER_PAGE } from "@/constants/customers.constant";

export function useCustomerPagination(totalItems: number, searchTerm: string) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, itemsPerPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginate = <T>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  };

  const goToNextPage = () => setPage((p) => Math.min(totalPages, p + 1));
  const goToPreviousPage = () => setPage((p) => Math.max(1, p - 1));

  return {
    page,
    itemsPerPage,
    setItemsPerPage,
    startIndex,
    endIndex,
    totalPages,
    paginate,
    goToNextPage,
    goToPreviousPage,
  };
}