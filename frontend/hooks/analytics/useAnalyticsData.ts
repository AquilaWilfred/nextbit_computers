import { useMemo } from "react";
import { useFetch } from "@/lib/api-hooks";
import { AnalyticsStats, TimeRange } from "@/types/analytics.types";

export function useAnalyticsData(timeRange: TimeRange) {
  const { data, isLoading, error } = useFetch<AnalyticsStats>(
    `/api/admin/stats?timeRange=${timeRange}`
  );

  // Memoized derived metrics
  const metrics = useMemo(() => {
    const revenueData = data?.revenueData || [];
    const totalVisitors = revenueData.reduce(
      (sum, day) => sum + (day.visitors || 0), 0
    ) || 1;
    const totalOrders = data?.totalOrders || 0;
    const conversionRate = ((totalOrders / totalVisitors) * 100).toFixed(1);
    const avgOrderValue = totalOrders > 0 
      ? (parseFloat(data?.totalRevenue as string) / totalOrders).toFixed(2) 
      : "0.00";
    const returningUsersPercentage = data?.totalCustomers 
      ? Math.round(((data?.returningUsersCount || 0) / data.totalCustomers) * 100) 
      : 0;

    return {
      revenueData,
      categoryData: data?.categoryData || [],
      brandData: data?.brandData || [],
      trafficSourceData: data?.trafficSourceData || [],
      aiRevenueData: data?.aiRevenueData || [],
      totalVisitors,
      totalOrders,
      conversionRate,
      avgOrderValue,
      returningUsersPercentage,
      trends: data?.trends,
    };
  }, [data]);

  return {
    data: metrics,
    rawData: data,
    isLoading,
    error,
  };
}