// hooks/payments/useExportFormat.ts

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { downloadTableExport, getSavedExportFormat, setSavedExportFormat } from "@/lib/export";
import { Payment, PayoutRequest } from "@/types/pay.types";
import { formatAmount, formatDateTime } from "@/lib/utils/pay.utils";

export type ExportFormat = "csv" | "excel" | "pdf";

export function useExportFormat() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>(getSavedExportFormat());

  const handleExportFormatChange = useCallback((format: ExportFormat) => {
    setExportFormat(format);
    setSavedExportFormat(format);
  }, []);

  const handleExportPayments = useCallback((payments: Payment[], filename: string) => {
    if (!payments.length) {
      toast.error("No payment data to export.");
      return;
    }

    const rows = [
      ["Payment ID", "Order ID", "Method", "Amount", "Status", "Date"],
      ...payments.map((p) => [
        p.id.toString(),
        p.orderId.toString(),
        p.method,
        p.amount.toString(),
        p.status,
        formatDateTime(p.createdAt),
      ]),
    ];

    downloadTableExport(filename, exportFormat, rows);
  }, [exportFormat]);

  const handleExportPayouts = useCallback((payouts: PayoutRequest[], filename: string) => {
    if (!payouts.length) {
      toast.error("No payout data to export.");
      return;
    }

    const rows = [
      ["Request ID", "Agent ID", "Amount", "Status", "Requested At", "Processed At", "Transaction ID"],
      ...payouts.map((p) => [
        p.id.toString(),
        p.agentId.toString(),
        formatAmount(parseFloat(p.amount)),
        p.status,
        formatDateTime(p.requestedAt),
        p.processedAt ? formatDateTime(p.processedAt) : "",
        p.transactionId || "",
      ]),
    ];

    downloadTableExport(filename, exportFormat, rows);
  }, [exportFormat]);

  // Add this generic handleExport function
  const handleExport = useCallback((data: any[], filename: string) => {
    if (!data.length) {
      toast.error("No data to export.");
      return;
    }
    
    // Detect if it's payments or payouts by checking the structure
    const isPayment = data[0] && 'orderId' in data[0];
    
    if (isPayment) {
      handleExportPayments(data as Payment[], filename);
    } else {
      handleExportPayouts(data as PayoutRequest[], filename);
    }
  }, [handleExportPayments, handleExportPayouts]);

  return {
    exportFormat,
    setExportFormat: handleExportFormatChange,
    handleExport,  // ← Add this export
    exportPayments: handleExportPayments,
    exportPayouts: handleExportPayouts,
  };
}