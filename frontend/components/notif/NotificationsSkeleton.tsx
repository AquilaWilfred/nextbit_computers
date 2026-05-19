"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const NotificationsSkeleton = memo(function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-5 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-8 bg-muted rounded w-1/4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
});

// Or keep the spinner version for initial load
export const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex justify-center py-20" aria-live="polite" aria-busy="true">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
    </div>
  );
});