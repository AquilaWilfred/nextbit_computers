// 05-components/cards/CardsStats.tsx

"use client";

import { FC } from 'react';
import { Wallet, Activity, Award, Shield } from 'lucide-react';
import { UserStats } from '@/types/nextbit-wallet/cards.types';

interface CardsStatsProps {
  stats: UserStats;
  cardsIssued: number;
}

const iconMap = {
  Wallet: Wallet,
  Activity: Activity,
  Award: Award,
  Shield: Shield,
};

export const CardsStats: FC<CardsStatsProps> = ({ stats, cardsIssued }) => {
  const statItems = [
    { 
      icon: Wallet, 
      label: "Virtual Cards Issued", 
      value: String(cardsIssued),
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    { 
      icon: Activity, 
      label: "Total Spent", 
      value: `KES ${stats.totalSpent.toLocaleString()}`,
      bgColor: "bg-cyan-100",
      iconColor: "text-cyan-600"
    },
    { 
      icon: Award, 
      label: "Rewards Earned", 
      value: `${stats.rewardsEarned.toLocaleString()} pts`,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    { 
      icon: Shield, 
      label: "Security Level", 
      value: stats.securityLevel,
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{item.label}</div>
                <div className="text-xl font-bold text-gray-800">{item.value}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};