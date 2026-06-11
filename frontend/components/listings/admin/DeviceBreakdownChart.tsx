// components/listings/DeviceBreakdownChart.tsx

"use client";

import { FC } from 'react';
import { DEVICE_LABELS } from '@/constants/listings/admin.listings.constants';
import { DeviceType } from '@/types/listings/admin.listings.types';

interface DeviceBreakdownChartProps {
  breakdown: Record<string, number>;
  total: number;
}

export const DeviceBreakdownChart: FC<DeviceBreakdownChartProps> = ({ breakdown, total }) => {
  const sortedDevices = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedDevices.length === 0) return null;

  return (
    <div style={{
      background: "#fff", 
      border: "1px solid #e5e7eb",
      borderRadius: 16, 
      padding: "18px 24px", 
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
        Submissions by Device Type
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sortedDevices.map(([deviceType, count]) => {
          const percentage = Math.round((count / total) * 100);
          return (
            <div key={deviceType} style={{
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              background: "#f8fafc", 
              border: "1px solid #e5e7eb",
              borderRadius: 10, 
              padding: "8px 14px", 
              minWidth: 72,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{count}</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                {DEVICE_LABELS[deviceType as DeviceType]}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>{percentage}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};