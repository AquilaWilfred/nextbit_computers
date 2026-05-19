"use client";

import { memo } from "react";
import { StoreStatus } from "@/types/network/stores/man.types";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "@/constants/network/stores/man.constants";

interface StatusBadgeProps {
  status: StoreStatus;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
});