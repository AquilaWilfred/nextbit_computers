"use client";

import { memo } from "react";
import { STATUS_STYLES } from "@/constants/dashboard.constants";
import { formatStatus } from "@/lib/utils/dashboard.utils";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const className = STATUS_STYLES[status] || STATUS_STYLES.pending;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {formatStatus(status)}
    </span>
  );
});