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
import { AnalyticsDataPoint } from "@/types/analytics.types";

interface VisitorsChartProps {
  data: AnalyticsDataPoint[];
}

export const VisitorsChart = memo(function VisitorsChart({ data }: VisitorsChartProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6">Store Visitors</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
            <Area type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});