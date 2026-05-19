"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download } from "lucide-react";
import { TIME_RANGE_OPTIONS, EXPORT_FORMATS } from "@/constants/analytics.constants";
import { TimeRange } from "@/types/analytics.types";

interface AnalyticsHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
  exportFormat: string;
  onExportFormatChange: (format: any) => void;
  onExport: () => void;
  isExportDisabled: boolean;
}

export const AnalyticsHeader = memo(function AnalyticsHeader({
  timeRange,
  onTimeRangeChange,
  exportFormat,
  onExportFormatChange,
  onExport,
  isExportDisabled,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold">Analytics & Reports</h2>
        <p className="text-muted-foreground mt-1">
          Detailed insights into your store's performance
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-40 h-10">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={exportFormat} onValueChange={onExportFormatChange}>
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="Export format" />
          </SelectTrigger>
          <SelectContent>
            {EXPORT_FORMATS.map(format => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          className="gap-2 h-10"
          onClick={onExport}
          disabled={isExportDisabled}
        >
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>
    </div>
  );
});