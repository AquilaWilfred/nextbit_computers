// components/listings/AdminTradeInHeader.tsx

"use client";

import { FC } from 'react';

export const AdminTradeInHeader: FC = () => {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>
        Trade-In Management
      </h1>
      <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
        Review, approve, and manage all device submissions across NextBit Marketplace.
      </p>
    </div>
  );
};