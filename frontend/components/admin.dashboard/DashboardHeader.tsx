"use client";

import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { TIME_RANGE_OPTIONS } from "@/constants/dashboard.constants";
import { TimeRange } from "@/types/dashboard.types";

interface DashboardHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
}

export const DashboardHeader = memo(function DashboardHeader({
  timeRange,
  onTimeRangeChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your store's activity</p>
      </div>
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-40 h-10 bg-card" aria-label="Select time range">
          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});