// components/listings/TradeInTableRow.tsx

"use client";

import { FC, memo } from 'react';
import { AdminListing } from '@/types/listings/admin.listings.types';
import { StatusBadge } from './StatusBadge';
import { ConditionBadge } from './ConditionBadge';
import { DEVICE_LABELS } from '@/constants/listings/admin.listings.constants';
import { parseImages } from '@/lib/utils/image-utils';

interface TradeInTableRowProps {
  listing: AdminListing;
  isLast: boolean;
  onRowClick: (listing: AdminListing) => void;
  onReviewClick: (listing: AdminListing) => void;
}

export const TradeInTableRow: FC<TradeInTableRowProps> = memo(({ 
  listing, 
  isLast, 
  onRowClick, 
  onReviewClick 
}) => {
  const firstImage = parseImages(listing.images)[0] || "https://placehold.co/80x80/2563EB/white?text=D";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "56px 2fr 1fr 1fr 1fr 1fr 1fr 100px",
        alignItems: "center",
        gap: 0,
        padding: "13px 18px",
        borderBottom: !isLast ? "1px solid #f3f4f6" : "none",
        transition: "background 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      onClick={() => onRowClick(listing)}
    >
      {/* Thumbnail */}
      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
        <img src={firstImage} alt={listing.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Device */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
          {listing.brand} {listing.model}
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {listing.listing_number} · {DEVICE_LABELS[listing.device_type]}
        </div>
      </div>

      {/* Seller */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{listing.seller_name || "—"}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          {listing.seller_rating ? `⭐ ${listing.seller_rating}` : ""}
          {listing.drop_branch ? ` · ${listing.drop_branch}` : ""}
        </div>
      </div>

      {/* Condition */}
      <div><ConditionBadge condition={listing.condition} /></div>

      {/* Price */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          KES {listing.asking_price_kes.toLocaleString()}
        </div>
        {listing.credit_issued_kes && (
          <div style={{ fontSize: 11, color: "#16a34a" }}>
            Paid: KES {listing.credit_issued_kes.toLocaleString()}
          </div>
        )}
      </div>

      {/* Status */}
      <div><StatusBadge status={listing.status} /></div>

      {/* Views */}
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        {listing.views ? `👁 ${listing.views}` : "—"}
      </div>

      {/* Action button */}
      <div onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onReviewClick(listing)}
          style={{
            background: "#1e293b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Review →
        </button>
      </div>
    </div>
  );
});

TradeInTableRow.displayName = 'TradeInTableRow';