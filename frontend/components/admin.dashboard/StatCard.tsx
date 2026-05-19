"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { TrendBadge } from "./TrendBadge";

const iconMap = {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
};

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  Icon: keyof typeof iconMap;
  gradient: string;
  iconColor: string;
}

export const StatCard = memo(function StatCard({
  label,
  value,
  trend,
  trendLabel,
  Icon: iconName,
  gradient,
  iconColor,
}: StatCardProps) {
  const Icon = iconMap[iconName];

  return (
    <Card className={`p-6 bg-gradient-to-br ${gradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {trend !== undefined ? (
            <TrendBadge value={trend} />
          ) : trendLabel ? (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              {trendLabel}
            </p>
          ) : null}
        </div>
        <Icon size={40} className={`${iconColor} opacity-20`} />
      </div>
    </Card>
  );
});