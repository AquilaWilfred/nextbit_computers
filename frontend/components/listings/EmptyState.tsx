// components/listings/EmptyState.tsx
"use client";

import { FC } from 'react';

export const EmptyState: FC = () => {
  return (
    <div className="text-center py-16 text-gray-400 text-sm border border-dashed rounded-xl">
      <div className="text-5xl mb-3">📭</div>
      <p className="font-medium">No trade-in requests yet</p>
      <p className="text-xs mt-1">
        Click "List Your Device" to start selling on NextBit Marketplace
      </p>
    </div>
  );
};