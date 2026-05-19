import { useState, useCallback } from "react";
import { TimeRange } from "@/types/dashboard.types";

export function useTimeRange(initialValue: TimeRange = "30d") {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialValue);

  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    setTimeRange(value);
  }, []);

  return {
    timeRange,
    setTimeRange: handleTimeRangeChange,
  };
}