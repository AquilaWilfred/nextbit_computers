// components/nextbit-wallet/admin/StatsGrid.tsx

"use client";

import { FC, JSX } from "react";
import { StatCard } from "./StatCard";
import { AdminStats } from "@/types/nextbit-wallet/admin.cards.types";
import { STAT_CARDS_CONFIG } from "@/constants/nextbit-wallet/admin.cards.constants";

interface StatsGridProps {
  stats: AdminStats;
}

const iconMap: Record<string, (props: { className?: string }) => JSX.Element> = {
  Card: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="1.7"/><path d="M2 10h20" strokeWidth="1.7"/></svg>,
  Check: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="1.7"/></svg>,
  Lock: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.7"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="1.7"/></svg>,
  Clock: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.7"/><polyline points="12 6 12 12 16 14" strokeWidth="1.7"/></svg>,
  Flag: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.7"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.7"/></svg>,
  Warning: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="1.7"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="1.7"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="1.7"/></svg>,
  Users: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.7"/></svg>,
  Zap: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth="1.7"/></svg>,
  X: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" strokeWidth="1.7"/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="1.7"/></svg>,
  Dollar: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" strokeWidth="1.7"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="1.7"/></svg>,
  Activity: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.7"/></svg>,
};

export const StatsGrid: FC<StatsGridProps> = ({ stats }) => {
  const getStatValue = (config: typeof STAT_CARDS_CONFIG[0]): string | number => {
    let value = stats[config.key as keyof AdminStats] as number;
    
    if (config.isCurrency) {
      if (config.isMillions) {
        return `KES ${(value / 1000000).toFixed(1)}M`;
      }
      return `KES ${value.toLocaleString()}`;
    }
    
    if (config.key === "activeCards" && stats.totalCards > 0) {
      const percentage = Math.round((stats.activeCards / stats.totalCards) * 100);
      return `${percentage}%`;
    }
    
    return value;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {STAT_CARDS_CONFIG.map((config) => (
        <StatCard
          key={config.key}
          label={config.label}
          value={getStatValue(config)}
          color={config.color}
          icon={iconMap[config.icon]?.({ className: "w-5 h-5" })}
        />
      ))}
    </div>
  );
};