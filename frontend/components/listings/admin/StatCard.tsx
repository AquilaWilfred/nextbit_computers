// components/listings/StatCard.tsx

"use client";

import { FC } from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}

export const StatCard: FC<StatCardProps> = ({ icon, label, value, sub, accent }) => {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: 4,
        height: "100%", background: accent, borderRadius: "16px 0 0 16px",
      }} />
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
};