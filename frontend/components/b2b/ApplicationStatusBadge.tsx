"use client";

import { memo } from "react";
import { AppStatus } from "@/types/b2b.applications.types";
import { APP_STATUS } from "@/constants/b2b.applications.consntants";

interface ApplicationStatusBadgeProps {
  status: AppStatus;
  showIcon?: boolean;
}

export const ApplicationStatusBadge = memo(function ApplicationStatusBadge({
  status,
  showIcon = true,
}: ApplicationStatusBadgeProps) {
  const config = APP_STATUS[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${config.color}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
});