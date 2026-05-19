"use client";

import { memo } from "react";

export const EmptyState = memo(function EmptyState() {
  return (
    <div className="text-center py-16 text-muted-foreground text-sm">
      No stores found.
    </div>
  );
});