"use client";

import { memo } from "react";
import { EscrowState } from "@/types/pay.types";
import { getEscrowStateColor, getEscrowStateLabel } from "@/lib/utils/pay.utils";

interface EscrowStatusBadgeProps {
  state: EscrowState | string;
  className?: string;
}

export const EscrowStatusBadge = memo(function EscrowStatusBadge({
  state,
  className = "",
}: EscrowStatusBadgeProps) {
  const colorClass = getEscrowStateColor(state);
  const label = getEscrowStateLabel(state);

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
});
