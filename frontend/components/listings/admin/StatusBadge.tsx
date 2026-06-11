// components/listings/StatusBadge.tsx

"use client";

import { FC } from 'react';
import { TradeInStatus } from '@/types/listings/admin.listings.types';
import { STATUS_CONFIG } from '@/constants/listings/admin.listings.constants';

interface StatusBadgeProps {
  status: TradeInStatus;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  
  return (
    <span style={{
      background: config.bg,
      color: config.color,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      {config.label}
    </span>
  );
};