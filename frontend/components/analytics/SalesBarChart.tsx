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
} from "recharts";
import { formatPrice } from "@/lib/cart";

interface SalesBarChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
}

export const SalesBarChart = memo(function SalesBarChart({
  title,
  data,
  dataKey,
  color,
}: SalesBarChartProps) {
  if (!data?.length) return null;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatPrice(val)}
            />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
              formatter={(value: any) => formatPrice(value)}
            />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});