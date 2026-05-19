"use client";

import { memo } from "react";

export const BrandEmptyState = memo(function BrandEmptyState() {
  return (
    <p className="text-center text-muted-foreground py-12">
      No brands match your filter.
    </p>
  );
});