"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";

interface FederationAdoptionCardProps {
  federated: number;
  total: number;
}

export const FederationAdoptionCard = memo(function FederationAdoptionCard({
  federated,
  total,
}: FederationAdoptionCardProps) {
  const percentage = Math.round((federated / Math.max(total, 1)) * 100);

  return (
    <Card className="border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Federation Adoption</h3>
        <span className="text-xs font-bold text-[var(--brand)]">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand)] rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {federated} of {total} stores have federation enabled
      </p>
    </Card>
  );
});