"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";

export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard data">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse bg-secondary h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 animate-pulse bg-secondary h-[350px]" />
        <Card className="p-6 animate-pulse bg-secondary h-[350px]" />
      </div>
      <Card className="p-6 animate-pulse bg-secondary h-[400px]" />
    </div>
  );
});