"use client";

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/analytics/useAnalyticsData";
import { useAnalyticsExport } from "@/hooks/analytics/useAnalyticsExport";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { KPICards } from "@/components/analytics/KPICards";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { TrafficSourcesChart } from "@/components/analytics/TrafficSourcesChart";
import { AIRevenueChart } from "@/components/analytics/AIRevenueChart";
import { SalesBarChart } from "@/components/analytics/SalesBarChart";
import { VisitorsChart } from "@/components/analytics/VisitorsChart";
import { TimeRange } from "@/types/analytics.types";

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data, isLoading } = useAnalyticsData(timeRange);
  const { handleExport, handleFormatChange, savedFormat } = useAnalyticsExport(data.revenueData);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <AnalyticsHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          exportFormat={savedFormat}
          onExportFormatChange={handleFormatChange}
          onExport={() => handleExport(savedFormat as any)}
          isExportDisabled={!data.revenueData.length}
        />

        <KPICards
          totalVisitors={data.totalVisitors}
          conversionRate={data.conversionRate}
          avgOrderValue={data.avgOrderValue}
          returningUsersPercentage={data.returningUsersPercentage}
          trends={data.trends}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueChart data={data.revenueData} />
          <TrafficSourcesChart data={data.trafficSourceData} />
        </div>

        <AIRevenueChart data={data.aiRevenueData} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SalesBarChart
            title="Sales by Category"
            data={data.categoryData}
            dataKey="sales"
            color="#8b5cf6"
          />
          <SalesBarChart
            title="Sales by Brand"
            data={data.brandData}
            dataKey="sales"
            color="#3b82f6"
          />
          <VisitorsChart data={data.revenueData} />
        </div>
      </div>
    </div>
  );
}