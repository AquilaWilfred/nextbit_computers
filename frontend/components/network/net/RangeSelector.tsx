"use client";

import { memo } from "react";
import { RANGE_OPTIONS } from "@/constants/network/net.constants";
import { RangeValue } from "@/types/network/analytics.types";

interface RangeSelectorProps {
  currentRange: RangeValue;
  onRangeChange: (value: RangeValue) => void;
}

export const RangeSelector = memo(function RangeSelector({
  currentRange,
  onRangeChange,
}: RangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onRangeChange(option.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            currentRange === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});