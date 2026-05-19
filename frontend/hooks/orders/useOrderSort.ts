import { useState, useMemo } from "react";
import { Order, SortConfig } from "@/types/orders.types";
import { sortOrders } from "@/lib/utils/order.utils";

export function useOrderSort(orders: Order[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedOrders = useMemo(() => {
    return sortOrders(orders, sortConfig);
  }, [orders, sortConfig]);

  return {
    sortConfig,
    sortedOrders,
    handleSort,
  };
}