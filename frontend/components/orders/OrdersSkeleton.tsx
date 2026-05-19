"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";

export const OrdersSkeleton = memo(function OrdersSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </Card>
  );
});