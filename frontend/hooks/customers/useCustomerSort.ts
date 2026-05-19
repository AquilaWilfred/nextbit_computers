import { useState, useMemo } from "react";
import { Customer, SortConfig } from "@/types/customers.types";

export function useCustomerSort(customers: Customer[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: keyof Customer) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedCustomers = useMemo(() => {
    if (!sortConfig) return customers;

    const { key, direction } = sortConfig;
    return [...customers].sort((a, b) => {
      const aVal = a[key] ?? "";
      const bVal = b[key] ?? "";
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === "asc" ? comparison : -comparison;
    });
  }, [customers, sortConfig]);

  return {
    sortConfig,
    sortedCustomers,
    handleSort,
  };
}