"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Eye, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { formatPrice } from "@/lib/cart";

interface KPICardsProps {
  totalVisitors: number;
  conversionRate: string;
  avgOrderValue: string;
  returningUsersPercentage: number;
  trends?: {
    pageViews?: number;
    conversion?: number;
    aov?: number;
    returning?: number;
  };
}

const TrendIndicator = ({ value }: { value?: number }) => {
  if (!value) return null;
  const isPositive = value >= 0;
  return (
    <p className={`text-xs font-medium flex items-center mt-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
      <TrendingUp className={`w-3 h-3 mr-1 ${!isPositive ? "rotate-180" : ""}`} />
      {isPositive ? "+" : ""}{value}%
    </p>
  );
};

export const KPICards = memo(function KPICards({
  totalVisitors,
  conversionRate,
  avgOrderValue,
  returningUsersPercentage,
  trends,
}: KPICardsProps) {
  const cards = [
    {
      label: "Page Views",
      value: totalVisitors.toLocaleString(),
      trend: trends?.pageViews,
      icon: Eye,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      trend: trends?.conversion,
      icon: ShoppingBag,
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600",
    },
    {
      label: "Avg. Order Value",
      value: formatPrice(avgOrderValue),
      trend: trends?.aov,
      icon: TrendingUp,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600",
    },
    {
      label: "Returning Users",
      value: `${returningUsersPercentage}%`,
      trend: trends?.returning,
      icon: Users,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx} className="p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
            <card.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <h4 className="text-2xl font-bold">{card.value}</h4>
            <TrendIndicator value={card.trend} />
          </div>
        </Card>
      ))}
    </div>
  );
});