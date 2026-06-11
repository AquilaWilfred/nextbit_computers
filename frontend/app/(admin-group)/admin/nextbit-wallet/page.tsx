// pages/app/(admin-group)/admin/cards/page.tsx

"use client";

import { useState } from "react";
import { useAdminCardsData } from "@/hooks/nextbit-wallet/useAdminCardsData";
import { useCardActions } from "@/hooks/nextbit-wallet/useCardActions";
import { useApplicationActions } from "@/hooks/nextbit-wallet/useApplicationActions";
import { useAdminFilters } from "@/hooks/nextbit-wallet/useAdminFilters";
import { AdminTab } from "@/types/nextbit-wallet/admin.cards.types";
import {
  AdminCardsHeader,
  StatsGrid,
  CardTypeBreakdown,
  TabNavigation,
  FilterBar,
  LoadingSpinner,
  OverviewRecentActivity,
  CardsTable,
} from "@/components/nextbit-wallet/admin";
import {
  CARD_STATUS_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
} from "@/constants/nextbit-wallet/admin.cards.constants";

export default function CardsAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { stats, cards, applications, holders, transactions, loading, refetch } = useAdminCardsData();
  const { toggleFreeze, cancelCard, isLoading: isCardLoading } = useCardActions({ onSuccess: refetch });
  const { reviewApplication, isLoading: isAppLoading } = useApplicationActions({ onSuccess: refetch });
  const { search, statusFilter, setSearch, setStatusFilter } = useAdminFilters();

  // Filtered data
  const filteredCards = cards.filter(c => {
    const matchSearch = !search || 
      c.holderName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastFour.includes(search) ||
      c.holderEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredApps = applications.filter(a => {
    const matchSearch = !search || 
      a.holderName.toLowerCase().includes(search.toLowerCase()) ||
      a.holderEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fraudItemsCount = cards.filter(c => c.fraudFlag).length + 
    transactions.filter(t => t.status === "flagged").length;

  const tabCounts = {
    cards: cards.length,
    applications: applications.filter(a => a.status === "pending").length,
    holders: holders.length,
    transactions: transactions.length,
    fraud: fraudItemsCount,
  };

  if (loading && !stats) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AdminCardsHeader stats={stats} onRefresh={refetch} />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            <StatsGrid stats={stats} />
            <CardTypeBreakdown cards={cards} />
            <OverviewRecentActivity
              transactions={transactions}
              applications={applications}
              onApproveApplication={(id) => reviewApplication(id, "approved")}
              onRejectApplication={(id) => reviewApplication(id, "rejected")}
              isApplicationLoading={isAppLoading}
            />
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === "cards" && (
          <div className="space-y-4">
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusOptions={CARD_STATUS_OPTIONS}
              placeholder="Search name, email, last 4…"
            />
            <div className="text-xs text-gray-400 mb-2">{filteredCards.length} results</div>
            <CardsTable
              cards={filteredCards}
              onToggleFreeze={toggleFreeze}
              onCancelCard={cancelCard}
              isActionLoading={isCardLoading}
            />
          </div>
        )}

        {/* Additional tabs would go here following same pattern */}
      </div>
    </div>
  );
}