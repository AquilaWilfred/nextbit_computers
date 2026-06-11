// components/listings/FilterBar.tsx

"use client";

import { FC } from 'react';
import { FilterState, DeviceType, TradeInStatus, SortBy } from '@/types/listings/admin.listings.types';
import { DEVICE_LABELS, STATUS_OPTIONS, SORT_OPTIONS } from '@/constants/listings/admin.listings.constants';

interface FilterBarProps {
  filters: FilterState;
  branches: string[];
  resultsCount: number;
  onStatusChange: (status: "all" | TradeInStatus) => void;
  onDeviceTypeChange: (deviceType: "all" | DeviceType) => void;
  onBranchChange: (branch: string) => void;
  onSearchChange: (search: string) => void;
  onSortByChange: (sortBy: SortBy) => void;
}

export const FilterBar: FC<FilterBarProps> = ({
  filters,
  branches,
  resultsCount,
  onStatusChange,
  onDeviceTypeChange,
  onBranchChange,
  onSearchChange,
  onSortByChange,
}) => {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 20,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: "14px 18px",
      alignItems: "center",
    }}>
      {/* Search */}
      <input
        value={filters.search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="🔍 Search by ID, brand, model, seller…"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 13,
          minWidth: 220,
          flex: 1,
        }}
      />

      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => onStatusChange(e.target.value as "all" | TradeInStatus)}
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Device Filter */}
      <select
        value={filters.deviceType}
        onChange={(e) => onDeviceTypeChange(e.target.value as "all" | DeviceType)}
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}
      >
        <option value="all">All Devices</option>
        {(Object.keys(DEVICE_LABELS) as DeviceType[]).map(device => (
          <option key={device} value={device}>{DEVICE_LABELS[device]}</option>
        ))}
      </select>

      {/* Branch Filter */}
      <select
        value={filters.branch}
        onChange={(e) => onBranchChange(e.target.value)}
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}
      >
        <option value="all">All Branches</option>
        {branches.map(branch => (
          <option key={branch} value={branch}>{branch}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={(e) => onSortByChange(e.target.value as SortBy)}
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
        {resultsCount} results
      </div>
    </div>
  );
};