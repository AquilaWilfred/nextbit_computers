"use client";

import { memo } from "react";
import { StatCard } from "./StatCard";
import { STAT_CARDS } from "@/constants/dashboard.constants";
import { AdminStats } from "@/types/dashboard.types";

interface StatCardsGridProps {
  stats: AdminStats | null;
}

export const StatCardsGrid = memo(function StatCardsGrid({ stats }: StatCardsGridProps) {
  const formatValue = (key: keyof AdminStats, value: number): string => {
    if (key === "totalRevenue") {
      return `KES ${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map((card) => {
        const value = stats?.[card.key] as number ?? 0;
        const trend = stats?.trends?.[card.trendKey];
        
        return (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.formatValue(value)}
            trend={trend}
            Icon={card.Icon as any}
            gradient={card.gradient}
            iconColor={card.iconColor}
          />
        );
      })}
    </section>
  );
});