"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendPoint } from "@/types/network/analytics.types";
import { formatCurrency, formatCompactNumber, formatDay } from "@/lib/utils/network/net.utils";

interface RevenueTrendChartProps {
  data: TrendPoint[];
}

export const RevenueTrendChart = memo(function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (!data?.length) {
    return (
      <Card className="border border-border p-5 mb-5">
        <h3 className="font-semibold text-sm mb-4">Network Revenue Trend</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No data for this period
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border p-5 mb-5">
      <h3 className="font-semibold text-sm mb-4">Network Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand, #3b82f6)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--brand, #3b82f6)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            tickFormatter={formatDay}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={formatCompactNumber}
          />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--brand, #3b82f6)"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            name="Revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
});