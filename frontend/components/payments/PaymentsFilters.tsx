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
import { Search, Download } from "lucide-react";
import { ExportFormat } from "@/lib/export";

interface PaymentsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
  onReset?: () => void;
}

export const PaymentsFilters = memo(function PaymentsFilters({
  searchTerm,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  statusFilter,
  onStatusChange,
  exportFormat,
  onExportFormatChange,
  onExport,
  onReset,
}: PaymentsFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap flex-1 w-full gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <Input
              placeholder="Search ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-36 h-9"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-36 h-9"
          />
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {["all", "pending", "completed", "failed", "refunded"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Select value={exportFormat} onValueChange={onExportFormatChange}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Export format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 h-9" onClick={onExport}>
            <Download size={16} /> Export {exportFormat === "excel" ? "Excel" : exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </Card>
  );
});