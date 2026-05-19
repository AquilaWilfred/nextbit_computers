import { useState, useEffect, useMemo } from "react";
import { PayoutRequest } from "@/types/pay.types";
import { filterPayoutsByDateRange } from "@/lib/utils/pay.utils";

export function usePayoutFilters(payouts: PayoutRequest[]) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate, itemsPerPage]);

  const filteredPayouts = useMemo(() => {
    let filtered = filterPayoutsByDateRange(payouts, startDate, endDate);
    
    filtered = filtered.filter((p) => {
      return statusFilter === "all" || p.status === statusFilter;
    });
    
    return filtered;
  }, [payouts, statusFilter, startDate, endDate]);

  return {
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    filteredPayouts,
  };
}