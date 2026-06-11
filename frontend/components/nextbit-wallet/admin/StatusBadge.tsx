// components/nextbit-wallet/admin/StatusBadge.tsx

"use client";

import { FC } from "react";
import { STATUS_BADGE_CONFIG } from "@/constants/nextbit-wallet/admin.cards.constants";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.pending;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};