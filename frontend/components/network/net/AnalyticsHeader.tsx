"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Network, ChevronLeft, RefreshCw } from "lucide-react";
import { RangeSelector } from "./RangeSelector";
import { RangeValue } from "@/types/network/analytics.types";

interface AnalyticsHeaderProps {
  range: RangeValue;
  onRangeChange: (value: RangeValue) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AnalyticsHeader = memo(function AnalyticsHeader({
  range,
  onRangeChange,
  onRefresh,
  isRefreshing,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-4 h-4 text-[var(--brand)]" />
          <Link href="/admin/network" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Federated Network
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold">Analytics</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Network Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Combined revenue, transfers and federation performance across all stores.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <RangeSelector currentRange={range} onRangeChange={onRangeChange} />
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
        <Link href="/admin/network">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
      </div>
    </div>
  );
});