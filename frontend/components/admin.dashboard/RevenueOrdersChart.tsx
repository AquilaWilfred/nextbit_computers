"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MonthlyData } from "@/types/dashboard.types";

interface RevenueOrdersChartProps {
  data: MonthlyData[];
}

export const RevenueOrdersChart = memo(function RevenueOrdersChart({ data }: RevenueOrdersChartProps) {
  if (!data?.length) {
    return (
      <Card className="lg:col-span-2 p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Revenue & Orders</h2>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 p-6">
      <h2 className="text-lg font-semibold mb-4">Monthly Revenue & Orders</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: "#8b5cf6" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
});