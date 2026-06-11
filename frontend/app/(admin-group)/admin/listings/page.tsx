// 06-pages/app/(admin-group)/admin/trade-in/page.tsx

"use client";

import { useState } from 'react';
import { useAdminTradeInData } from '@/hooks/listings/useAdminTradeInData';
import { useAdminTradeInFilters } from '@/hooks/listings/useAdminTradeInFilters';
import { useAdminTradeInActions } from '@/hooks/listings/useAdminTradeInActions';
import { AdminListing } from '@/types/listings/admin.listings.types';
import {
  AdminTradeInHeader,
  StatsGrid,
  DeviceBreakdownChart,
  FilterBar,
  TradeInTable,
  DetailModal,
  LoadingSkeleton,
} from '@/components/listings/admin';

export default function TradeInAdminPage() {
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  
  const { filters, setStatus, setDeviceType, setBranch, setSearch, setSortBy } = useAdminTradeInFilters();
  const { listings, stats, loading, refetch } = useAdminTradeInData(filters);
  const { updating, updateStatus } = useAdminTradeInActions({ onSuccess: refetch });

  // Calculate top device type
  const topDeviceType = stats?.device_breakdown 
    ? Object.entries(stats.device_breakdown).sort((a, b) => b[1] - a[1])[0]
    : null;
  
  const topDeviceTypeData = topDeviceType ? {
    type: topDeviceType[0],
    count: topDeviceType[1],
  } : null;

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        
        <AdminTradeInHeader />
        
        {stats && (
          <>
            <StatsGrid stats={stats} topDeviceType={topDeviceTypeData} />
            <DeviceBreakdownChart breakdown={stats.device_breakdown} total={stats.total_listings} />
          </>
        )}
        
        <FilterBar
          filters={filters}
          branches={stats?.branches || []}
          resultsCount={listings.length}
          onStatusChange={setStatus}
          onDeviceTypeChange={setDeviceType}
          onBranchChange={setBranch}
          onSearchChange={setSearch}
          onSortByChange={setSortBy}
        />
        
        <TradeInTable
          listings={listings}
          onRowClick={setSelectedListing}
          onReviewClick={setSelectedListing}
        />
        
        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, color: "#c4cdd6", fontSize: 12 }}>
          NextBit Admin · Trade-In Module · {new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}
        </div>
      </div>

      {selectedListing && (
        <DetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onStatusChange={updateStatus}
          isUpdating={updating}
        />
      )}
    </div>
  );
}