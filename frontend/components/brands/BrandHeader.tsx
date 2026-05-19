"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface BrandHeaderProps {
  brandCount: number;
}

export const BrandHeader = memo(function BrandHeader({ brandCount }: BrandHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Brands Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage brands across electronics, networking, servers, software, and accessories.
        </p>
      </div>
      <Badge variant="secondary" className="text-sm px-3 py-1.5 shrink-0">
        {brandCount} brand{brandCount !== 1 ? "s" : ""} total
      </Badge>
    </div>
  );
});