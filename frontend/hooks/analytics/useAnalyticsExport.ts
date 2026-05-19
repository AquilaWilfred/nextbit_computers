import { useCallback } from "react";
import { downloadTableExport, getSavedExportFormat, setSavedExportFormat } from "@/lib/export";
import { AnalyticsDataPoint } from "@/types/analytics.types";

export type ExportFormat = "csv" | "excel" | "pdf";

export function useAnalyticsExport(revenueData: AnalyticsDataPoint[]) {
  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!revenueData || revenueData.length === 0) return;
      
      const rows = [
        ["Date", "Revenue", "Visitors"],
        ...revenueData.map((day) => [
          day.date,
          day.revenue?.toString() || "0",
          day.visitors?.toString() || "0",
        ]),
      ];
      
      downloadTableExport(`analytics-export`, format, rows);
    },
    [revenueData]
  );

  const handleFormatChange = useCallback((format: ExportFormat) => {
    setSavedExportFormat(format);
  }, []);

  const savedFormat = getSavedExportFormat();

  return {
    handleExport,
    handleFormatChange,
    savedFormat,
  };
}