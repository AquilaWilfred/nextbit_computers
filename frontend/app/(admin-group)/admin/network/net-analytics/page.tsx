"use client";

import { useRangeFilter } from "@/hooks/network/net/useRangeFilter";
import { useNetworkAnalytics } from "@/hooks/network/net/useNetworkAnalytics";
import { AnalyticsHeader } from "@/components/network/net/AnalyticsHeader";
import { StatCards } from "@/components/network/net/StatCards";
import { RevenueTrendChart } from "@/components/network/net/RevenueTrendChart";
import { RevenueByStoreChart } from "@/components/network/net/RevenueByStoreChart";
import { TransferStatusChart } from "@/components/network/net/TransferStatusChart";
import { FederationAdoptionCard } from "@/components/network/net/FederationAdoptionCard";
import { AnalyticsSkeleton } from "@/components/network/net/AnalyticsSkeleton";

export default function NetworkAnalyticsPage() {
  const { range, setRange } = useRangeFilter(30);
  const { data, loading, refreshing, refresh } = useNetworkAnalytics(range);

  if (loading) {
    return (
      <div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div>
      <AnalyticsHeader
        range={range}
        onRangeChange={setRange}
        onRefresh={refresh}
        isRefreshing={refreshing}
      />

      {data && (
        <>
          <StatCards data={data} />
          <RevenueTrendChart data={data.trend} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <RevenueByStoreChart data={data.storePerformance} />
            <TransferStatusChart transfers={data.transfers} />
          </div>
          
          <FederationAdoptionCard
            federated={data.federation.federated}
            total={data.federation.total}
          />
        </>
      )}
    </div>
  );
}