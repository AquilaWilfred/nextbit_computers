// components/listings/ConditionBadge.tsx

"use client";

import { FC } from 'react';
import { Condition } from '@/types/listings/admin.listings.types';
import { CONDITION_CONFIG } from '@/constants/listings/admin.listings.constants';

interface ConditionBadgeProps {
  condition: Condition;
}

export const ConditionBadge: FC<ConditionBadgeProps> = ({ condition }) => {
  const config = CONDITION_CONFIG[condition];
  
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11,
      fontWeight: 600,
      color: config.badgeColor,
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: config.badgeColor,
        display: "inline-block",
      }} />
      {config.label}
    </span>
  );
};