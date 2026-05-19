"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";

export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-[280px] rounded-xl bg-muted animate-pulse mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="h-[280px] rounded-xl bg-muted animate-pulse" />
        <div className="h-[280px] rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="h-[120px] rounded-xl bg-muted animate-pulse" />
    </>
  );
});