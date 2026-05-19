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
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { AnalyticsDataPoint } from "@/types/analytics.types";

interface AIRevenueChartProps {
  data: AnalyticsDataPoint[];
}

export const AIRevenueChart = memo(function AIRevenueChart({ data }: AIRevenueChartProps) {
  if (!data?.length) return null;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-pink-500" /> AI vs Organic Revenue
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatPrice(val)} dx={-10} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
            <Legend />
            <Area type="monotone" name="Organic Revenue" dataKey="organicRevenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrganic)" stackId="1" />
            <Area type="monotone" name="AI Assisted Revenue" dataKey="aiRevenue" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorAi)" stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});