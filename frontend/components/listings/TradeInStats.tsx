"use client";

import { FC } from 'react';
import { UserStats } from '@/types/listings/listings.types';

interface TradeInStatsProps {
  stats: UserStats;
  pendingCount: number;
}

export const TradeInStats: FC<TradeInStatsProps> = ({ stats, pendingCount }) => {
  const statItems = [
    { label: 'Active listings', value: stats.active_listings, color: 'text-blue-700' },
    { label: 'Sold devices', value: stats.sold_listings, color: 'text-green-600' },
    { label: 'Pending verification', value: pendingCount, color: 'text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
      {statItems.map((item, idx) => (
        <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</div>
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
};