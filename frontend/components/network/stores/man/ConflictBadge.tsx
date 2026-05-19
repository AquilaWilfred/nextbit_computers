"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { formatConflictFlags } from "@/lib/utils/network/stores/man.utils";

interface ConflictBadgeProps {
  count: number;
}

export const ConflictBadge = memo(function ConflictBadge({ count }: ConflictBadgeProps) {
  if (count === 0) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 border border-red-400/40 bg-red-500/10 rounded-full px-2 py-0.5">
      <AlertTriangle className="w-3 h-3" />
      {formatConflictFlags(count)}
    </span>
  );
});