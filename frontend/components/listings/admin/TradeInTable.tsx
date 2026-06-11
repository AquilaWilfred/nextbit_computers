// components/listings/admin/TradeInTable.tsx

"use client";

import { FC } from 'react';
import { AdminListing } from '@/types/listings/admin.listings.types';
import { TradeInTableRow } from './TradeInTableRow';
import { EmptyState } from './EmptyState';

interface TradeInTableProps {
  listings: AdminListing[];
  onRowClick: (listing: AdminListing) => void;
  onReviewClick: (listing: AdminListing) => void;
}

export const TradeInTable: FC<TradeInTableProps> = ({ listings, onRowClick, onReviewClick }) => {
  if (listings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Table Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "56px 2fr 1fr 1fr 1fr 1fr 1fr 100px",
        gap: 0,
        padding: "12px 18px",
        background: "#f8fafc",
        borderBottom: "1px solid #e5e7eb",
        fontSize: 11,
        fontWeight: 700,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        <span>Img</span>
        <span>Device</span>
        <span>Seller</span>
        <span>Condition</span>
        <span>Price</span>
        <span>Status</span>
        <span>Views</span>
        <span>Action</span>
      </div>

      {/* Table Body */}
      {listings.map((listing, idx) => (
        <TradeInTableRow
          key={listing.id}
          listing={listing}
          isLast={idx === listings.length - 1}
          onRowClick={onRowClick}
          onReviewClick={onReviewClick}
        />
      ))}
    </div>
  );
};