"use client";

import { memo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Customer, SortConfig } from "@/types/customers.types";

interface SortHeaderProps {
  label: string;
  column: keyof Customer;
  sortConfig: SortConfig;
  onSort: (column: keyof Customer) => void;
}

export const SortHeader = memo(function SortHeader({
  label,
  column,
  sortConfig,
  onSort,
}: SortHeaderProps) {
  return (
    <th
      scope="col"
      className="text-left py-3 px-4 font-semibold cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(column)}
      aria-sort={
        sortConfig?.key === column
          ? sortConfig.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </th>
  );
});