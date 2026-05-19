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
import { formatAmount } from "@/lib/utils/pay.utils";

interface PayoutsChartProps {
  data: { date: string; payouts: number }[];
}

export const PayoutsChart = memo(function PayoutsChart({ data = [] }: PayoutsChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Payouts Over Time</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v)} dx={-10} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
              formatter={(value: number) => [formatAmount(value), "Payouts"]}
            />
            <Area type="monotone" dataKey="payouts" stroke="var(--brand)" strokeWidth={2} fillOpacity={1} fill="url(#colorPayouts)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});