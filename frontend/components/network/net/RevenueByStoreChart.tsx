"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { StorePerf } from "@/types/network/analytics.types";
import { CHART_COLORS } from "@/constants/network/net.constants";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/network/net.utils";

interface RevenueByStoreChartProps {
  data: StorePerf[];
}

export const RevenueByStoreChart = memo(function RevenueByStoreChart({ data }: RevenueByStoreChartProps) {
  if (!data?.length) {
    return (
      <Card className="border border-border p-5">
        <h3 className="font-semibold text-sm mb-4">Revenue by Store</h3>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No store data
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Revenue by Store</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="store" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompactNumber} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
});