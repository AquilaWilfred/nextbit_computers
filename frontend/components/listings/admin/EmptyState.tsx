// components/listings/admin/EmptyState.tsx

"use client";

import { FC } from 'react';

export const EmptyState: FC = () => {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
      <div style={{ fontWeight: 600 }}>No submissions match your filters.</div>
    </div>
  );
};