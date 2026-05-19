"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, Globe2, ArrowRightLeft } from "lucide-react";
import { STAT_CARDS } from "@/constants/network/net.constants";
import { AnalyticsData } from "@/types/network/analytics.types";
import { formatCurrency, formatNumber, calculateFederationPercentage } from "@/lib/utils/network/net.utils";

const iconMap = {
  TrendingUp,
  BarChart3,
  Globe2,
  ArrowRightLeft,
};

interface StatCardsProps {
  data: AnalyticsData;
}

export const StatCards = memo(function StatCards({ data }: StatCardsProps) {
  const totalRevenue = data.storePerformance.reduce((sum, s) => sum + s.revenue, 0);
  const totalOrders = data.storePerformance.reduce((sum, s) => sum + s.orders, 0);
  const fedPercentage = calculateFederationPercentage(data.federation.federated, data.federation.total);

  const values = {
    revenue: formatCurrency(totalRevenue),
    orders: formatNumber(totalOrders),
    federation: `${data.federation.federated} / ${data.federation.total} (${fedPercentage}%)`,
    transfers: formatNumber(data.transfers.total),
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {STAT_CARDS.map((card) => {
        const Icon = iconMap[card.icon as keyof typeof iconMap];
        return (
          <Card key={card.label} className="border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold">{values[card.key]}</p>
          </Card>
        );
      })}
    </div>
  );
});