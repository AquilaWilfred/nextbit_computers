// components/nextbit-wallet/admin/AdminCardsHeader.tsx

"use client";

import { FC } from "react";
import { AdminStats } from "@/types/nextbit-wallet/admin.cards.types";

interface AdminCardsHeaderProps {
  stats: AdminStats | null;
  onRefresh: () => void;
}

export const AdminCardsHeader: FC<AdminCardsHeaderProps> = ({ stats, onRefresh }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="1.7" />
              <path d="M2 10h20" strokeWidth="1.7" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">NextBit Admin</span>
            <span className="ml-2 text-xs text-gray-400">Cards & Payments</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="text-xs bg-gray-100 text-gray-700 font-semibold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
          {stats && (
            <>
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
                {stats.fraudFlags} fraud flags
              </span>
              <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">
                {stats.pendingApplications} pending
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};