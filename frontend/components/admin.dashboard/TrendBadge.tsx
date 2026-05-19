"use client";

import { memo } from "react";
import { TrendingUp } from "lucide-react";

interface TrendBadgeProps {
  value: number;
}

export const TrendBadge = memo(function TrendBadge({ value }: TrendBadgeProps) {
  const isPositive = value >= 0;
  
  return (
    <p
      className={`text-xs mt-2 flex items-center gap-1 ${
        isPositive
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      <TrendingUp size={14} className={!isPositive ? "rotate-180" : ""} />
      {isPositive ? "+" : ""}
      {value}% from last month
    </p>
  );
});