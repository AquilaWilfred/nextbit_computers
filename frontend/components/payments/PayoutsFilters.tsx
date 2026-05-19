"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { ExportFormat } from "@/lib/export";

interface PayoutsFiltersProps {
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
}

export const PayoutsFilters = memo(function PayoutsFilters({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  statusFilter,
  onStatusChange,
  exportFormat,
  onExportFormatChange,
  onExport,
}: PayoutsFiltersProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Driver Payout Requests</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-36 h-9" />
          <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-36 h-9" />
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {["all", "pending", "completed", "failed"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={exportFormat} onValueChange={onExportFormatChange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
            <Download size={16} /> Export
          </Button>
        </div>
      </div>
    </Card>
  );
});