// components/listings/StatsGrid.tsx

"use client";

import { FC } from 'react';
import { StatCard } from './StatCard';
import { AdminStats } from '@/types/listings/admin.listings.types';
import { STAT_CARDS_CONFIG, DEVICE_LABELS } from '@/constants/listings/admin.listings.constants';

interface StatsGridProps {
  stats: AdminStats;
  topDeviceType: { type: string; count: number } | null;
}

export const StatsGrid: FC<StatsGridProps> = ({ stats, topDeviceType }) => {
  const getStatValue = (key: string): string | number => {
    switch (key) {
      case 'total_credit_issued':
        return `KES ${stats.total_credit_issued.toLocaleString()}`;
      case 'total_gmv':
        return `KES ${stats.total_gmv.toLocaleString()}`;
      case 'avg_price':
        return `KES ${stats.avg_price.toLocaleString()}`;
      case 'total_views':
        return stats.total_views.toLocaleString();
      default:
        return stats[key as keyof AdminStats] as number;
    }
  };

  // Add top device type as additional stat card
  const allStats = [...STAT_CARDS_CONFIG];
  if (topDeviceType) {
    allStats.push({
      key: "top_device",
      icon: "📱",
      label: "Top Device Type",
      accent: "#ea580c",
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 28 }}>
      {STAT_CARDS_CONFIG.map((config) => (
        <StatCard
          key={config.key}
          icon={config.icon}
          label={config.label}
          value={getStatValue(config.key)}
          sub={config.sub}
          accent={config.accent}
        />
      ))}
      {topDeviceType && (
        <StatCard
          icon="📱"
          label="Top Device Type"
          value={DEVICE_LABELS[topDeviceType.type as keyof typeof DEVICE_LABELS] || topDeviceType.type}
          sub={`${topDeviceType.count} submissions`}
          accent="#ea580c"
        />
      )}
    </div>
  );
};