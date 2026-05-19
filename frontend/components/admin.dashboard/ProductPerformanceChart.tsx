"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/constants/dashboard.constants";
import { ProductPerf } from "@/types/dashboard.types";

interface ProductPerformanceChartProps {
  data: ProductPerf[];
}

export const ProductPerformanceChart = memo(function ProductPerformanceChart({ data }: ProductPerformanceChartProps) {
  if (!data?.length) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Product Performance</h2>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Product Performance</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
});