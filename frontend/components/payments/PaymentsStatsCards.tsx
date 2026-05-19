"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Payment } from "@/types/pay.types";
import { calculatePaymentStats } from "@/lib/utils/pay.utils";

interface PaymentsStatsCardsProps {
  payments: Payment[];
}

export const PaymentsStatsCards = memo(function PaymentsStatsCards({ payments }: PaymentsStatsCardsProps) {
  const stats = calculatePaymentStats(payments);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <p className="text-sm text-muted-foreground font-medium">Total Payments</p>
        <p className="text-3xl font-bold mt-2">{stats.total}</p>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
        <p className="text-sm text-muted-foreground font-medium">Pending Payments</p>
        <p className="text-3xl font-bold mt-2">{stats.pending}</p>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
        <p className="text-sm text-muted-foreground font-medium">Failed Payments</p>
        <p className="text-3xl font-bold mt-2">{stats.failed}</p>
      </Card>
    </div>
  );
});