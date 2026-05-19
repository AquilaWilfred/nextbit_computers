"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw } from "lucide-react";

interface StoresHeaderProps {
  onRefresh: () => void;
}

export const StoresHeader = memo(function StoresHeader({ onRefresh }: StoresHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-4 h-4 text-[var(--brand)]" />
          <Link
            href="/admin/network"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Federated Network
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold">Stores</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Network Stores</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage federation per branch. Only Store Admins can toggle their own branch.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh
      </Button>
    </div>
  );
});