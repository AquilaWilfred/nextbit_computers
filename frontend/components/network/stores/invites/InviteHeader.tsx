"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Network, ChevronLeft } from "lucide-react";

export const InviteHeader = memo(function InviteHeader() {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-4 h-4 text-[var(--brand)]" />
          <Link href="/admin/network" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Federated Network
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <Link href="/admin/network/stores" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Stores
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold">Invite</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Invite a Store</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Send an email invitation or share a link to onboard a new store into the network.
        </p>
      </div>
      <Link href="/admin/network/stores">
        <Button variant="outline" size="sm" className="gap-2">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Button>
      </Link>
    </div>
  );
});