import { useState, useCallback } from "react";
import { RangeValue } from "@/types/network/analytics.types";

export function useRangeFilter(initialValue: RangeValue = 30) {
  const [range, setRange] = useState<RangeValue>(initialValue);

  const handleRangeChange = useCallback((value: RangeValue) => {
    setRange(value);
  }, []);

  return { range, setRange: handleRangeChange };
}