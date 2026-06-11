// components/nextbit-wallet/admin/TabNavigation.tsx

"use client";

import { FC, JSX } from "react";
import { AdminTab } from "@/types/nextbit-wallet/admin.cards.types";
import { TABS } from "@/constants/nextbit-wallet/admin.cards.constants";

interface TabNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  counts?: {
    cards?: number;
    applications?: number;
    holders?: number;
    transactions?: number;
    fraud?: number;
  };
}

const iconMap: Record<string, (props: { className?: string }) => JSX.Element> = {
  Activity: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.7"/></svg>,
  Card: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="1.7"/><path d="M2 10h20" strokeWidth="1.7"/></svg>,
  Clock: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.7"/><polyline points="12 6 12 12 16 14" strokeWidth="1.7"/></svg>,
  Users: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.7"/></svg>,
  Dollar: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" strokeWidth="1.7"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="1.7"/></svg>,
  Flag: ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.7"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.7"/></svg>,
};

export const TabNavigation: FC<TabNavigationProps> = ({ activeTab, onTabChange, counts }) => {
  return (
    <nav className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit">
      {TABS.map((tab) => {
        const Icon = iconMap[tab.icon];
        const tabCount = counts?.[tab.id as keyof typeof counts];
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tabCount !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {tabCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};