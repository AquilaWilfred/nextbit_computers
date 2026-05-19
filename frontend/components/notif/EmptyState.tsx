"use client";

import { memo } from "react";
import { CheckCircle } from "lucide-react";

export const EmptyState = memo(function EmptyState() {
  return (
    <div className="text-center py-20 bg-card border border-border rounded-xl border-dashed">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" aria-hidden />
      </div>
      <p className="font-medium text-lg">You're all caught up!</p>
      <p className="text-sm text-muted-foreground mt-1">
        No new notifications or actions required.
      </p>
    </div>
  );
});