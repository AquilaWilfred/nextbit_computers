"use client";

import { useAdminStats } from "@/hooks/dashboard/useAdminStats";
import { useTimeRange } from "@/hooks/dashboard/useTimeRange";
import { DashboardHeader } from "@/components/admin.dashboard/DashboardHeader";
import { StatCardsGrid } from "@/components/admin.dashboard/StatCardsGrid";
import { RevenueOrdersChart } from "@/components/admin.dashboard/RevenueOrdersChart";
import { ProductPerformanceChart } from "@/components/admin.dashboard/ProductPerformanceChart";
import { RecentOrdersTable } from "@/components/admin.dashboard/RecentOrdersTable";
import { DashboardSkeleton } from "@/components/admin.dashboard/DashboardSkeleton";
import { getRecentOrders } from "@/lib/utils/dashboard.utils";

export default function AdminDashboardPage() {
  const { timeRange, setTimeRange } = useTimeRange();
  const { data: stats, isLoading } = useAdminStats(timeRange);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const monthlyRevenueData = stats?.monthlyRevenueData ?? [];
  const productPerformanceData = stats?.productPerformanceData ?? [];
  const recentOrders = getRecentOrders(stats?.recentOrders ?? [], 5);

  return (
    <div>
      <div className="space-y-8">
        <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        
        <StatCardsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueOrdersChart data={monthlyRevenueData} />
          <ProductPerformanceChart data={productPerformanceData} />
        </div>

        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
}