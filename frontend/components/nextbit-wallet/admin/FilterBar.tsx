// components/nextbit-wallet/admin/FilterBar.tsx

"use client";

import { FC } from "react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  placeholder?: string;
  showStatusFilter?: boolean;
}

export const FilterBar: FC<FilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  placeholder = "Search...",
  showStatusFilter = true,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.7"/>
            </svg>
          </span>
          <input
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-64"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {showStatusFilter && (
          <select
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};