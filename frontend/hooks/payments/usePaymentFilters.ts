import { useState, useEffect, useMemo } from "react";
import { Payment } from "@/types/pay.types";
import { filterPaymentsByDateRange } from "@/lib/utils/pay.utils";

export function usePaymentFilters(payments: Payment[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, itemsPerPage]);

  const filteredPayments = useMemo(() => {
    let filtered = filterPaymentsByDateRange(payments, startDate, endDate);
    
    filtered = filtered.filter((p) => {
      const matchesSearch = p.id.toString().includes(searchTerm) || 
                           p.orderId.toString().includes(searchTerm);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    
    return filtered;
  }, [payments, searchTerm, statusFilter, startDate, endDate]);

  return {
    searchTerm,
    setSearchTerm,
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
    filteredPayments,
  };
}