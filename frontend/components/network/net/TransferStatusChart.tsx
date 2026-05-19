"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PIE_COLORS, TRANSFER_CATEGORIES } from "@/constants/network/net.constants";
import { AnalyticsData } from "@/types/network/analytics.types";
import { getTransferPieData } from "@/lib/utils/network/net.utils";

const iconMap = {
  CheckCircle2,
  Clock,
  AlertTriangle,
};

interface TransferStatusChartProps {
  transfers: AnalyticsData["transfers"];
}

export const TransferStatusChart = memo(function TransferStatusChart({ transfers }: TransferStatusChartProps) {
  const pieData = getTransferPieData(transfers);
  const hasData = pieData.length > 0;

  return (
    <Card className="border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Transfer Status Breakdown</h3>
      
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No transfers in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3">
        {TRANSFER_CATEGORIES.map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap];
          const value = transfers[category.key];
          return (
            <div key={category.label} className="text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${category.color}`} />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{category.label}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
});