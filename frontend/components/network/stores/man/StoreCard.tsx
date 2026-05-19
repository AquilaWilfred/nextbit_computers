"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Store, MapPin, PackageSearch, ArrowRightLeft } from "lucide-react";
import { Branch } from "@/types/network/stores/man.types";
import { StatusBadge } from "./StatusBadge";
import { ConflictBadge } from "./ConflictBadge";
import { FederationToggle } from "./FederationToggle";
import { formatStockUnits, formatPendingTransfers } from "@/lib/utils/network/stores/man.utils";

interface StoreCardProps {
  branch: Branch;
  isToggling: boolean;
  onToggleFederation: () => void;
}

export const StoreCard = memo(function StoreCard({
  branch,
  isToggling,
  onToggleFederation,
}: StoreCardProps) {
  const canToggle = branch.status !== "pending";

  return (
    <Card className="border border-border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Left: Store Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Store className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="font-semibold text-sm">{branch.name}</p>
          <StatusBadge status={branch.status} />
          <ConflictBadge count={branch.conflictFlags} />
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          {branch.location}
          {branch.joinedNetwork && (
            <span className="ml-2 text-muted-foreground/60">
              · Joined {branch.joinedNetwork}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <PackageSearch className="w-3 h-3" />
            {formatStockUnits(branch.stockUnits)} units
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <ArrowRightLeft className="w-3 h-3" />
            {formatPendingTransfers(branch.pendingTransfers)}
          </span>
        </div>
      </div>

      {/* Right: Federation Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs font-semibold text-foreground">
            {branch.federationEnabled ? "In Network" : "Not Federated"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {branch.federationEnabled
              ? "Stock visible network-wide"
              : "Isolated from network"}
          </p>
        </div>
        <FederationToggle
          enabled={branch.federationEnabled}
          disabled={isToggling || !canToggle}
          onToggle={onToggleFederation}
        />
      </div>
    </Card>
  );
});