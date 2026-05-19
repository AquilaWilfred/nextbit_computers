"use client";

import { memo } from "react";
import { getStockBadgeColor } from "@/lib/utils/products/man/man.products.utils";

interface StockBadgeProps {
  stock: number;
}

export const StockBadge = memo(function StockBadge({ stock }: StockBadgeProps) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockBadgeColor(stock)}`}>
      {stock}
    </span>
  );
});