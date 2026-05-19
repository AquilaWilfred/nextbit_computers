"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { PayoutRequest } from "@/types/pay.types";
import { calculatePayoutStats, formatAmount } from "@/lib/utils/pay.utils";

interface PayoutsStatsCardsProps {
  payouts: PayoutRequest[];
  totalPayouts?: number;
}

export const PayoutsStatsCards = memo(function PayoutsStatsCards({ payouts, totalPayouts = 0 }: PayoutsStatsCardsProps) {
  const stats = calculatePayoutStats(payouts);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
        <p className="text-sm text-muted-foreground font-medium">Total Paid Out</p>
        <p className="text-3xl font-bold mt-2">{formatAmount(totalPayouts)}</p>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
        <p className="text-sm text-muted-foreground font-medium">Pending Requests</p>
        <p className="text-3xl font-bold mt-2">{stats.pendingCount}</p>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
        <p className="text-sm text-muted-foreground font-medium">Pending Amount</p>
        <p className="text-3xl font-bold mt-2">{formatAmount(stats.pendingAmount)}</p>
      </Card>
    </div>
  );
});