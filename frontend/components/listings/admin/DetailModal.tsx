// components/listings/admin/DetailModal.tsx

"use client";

import { FC, useState } from 'react';
import { AdminListing, TradeInStatus } from '@/types/listings/admin.listings.types';
import { StatusBadge } from './StatusBadge';
import { ConditionBadge } from './ConditionBadge';
import { DEVICE_LABELS, CONDITION_CONFIG } from '@/constants/listings/admin.listings.constants';
import { parseImages } from '@/lib/utils/image-utils';

interface DetailModalProps {
  listing: AdminListing;
  onClose: () => void;
  onStatusChange: (id: number, status: TradeInStatus, credit?: number, reason?: string) => Promise<void>;
  isUpdating: boolean;
}

export const DetailModal: FC<DetailModalProps> = ({ listing, onClose, onStatusChange, isUpdating }) => {
  const [creditInput, setCreditInput] = useState(listing.credit_issued_kes?.toString() || "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async (newStatus: TradeInStatus) => {
    setLoading(true);
    try {
      const credit = newStatus === "sold" ? parseInt(creditInput || "0") : undefined;
      const reason = newStatus === "rejected" ? rejectionReason : undefined;
      await onStatusChange(listing.id, newStatus, credit, reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const firstImage = parseImages(listing.images)[0] || "https://placehold.co/600x400/2563EB/white?text=Device";

  const infoFields = [
    ["Seller", listing.seller_name || "—"],
    ["Email", listing.user_email],
    ["Rating", listing.seller_rating ? `⭐ ${listing.seller_rating}` : "—"],
    ["Condition", CONDITION_CONFIG[listing.condition].label],
    ["Asking Price", `KES ${listing.asking_price_kes.toLocaleString()}`],
    ["Drop-off Branch", listing.drop_branch || "—"],
    ["Location", listing.location || "—"],
    ["Views", listing.views?.toString() || "0"],
    ["Listed", new Date(listing.created_at).toLocaleDateString()],
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
              {listing.brand} {listing.model}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {listing.listing_number} · {DEVICE_LABELS[listing.device_type]}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={listing.status} />
            <button onClick={onClose} style={{
              background: "#f3f4f6", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280",
            }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Image */}
          <div style={{
            borderRadius: 12, overflow: "hidden", height: 200,
            background: "#f9fafb", border: "1px solid #e5e7eb",
          }}>
            <img src={firstImage} alt={listing.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {infoFields.map(([label, value]) => (
              <div key={label} style={{
                background: "#f9fafb", borderRadius: 10, padding: "10px 14px",
              }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Specs */}
          {listing.specs && (
            <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#0369a1", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                Specifications
              </div>
              <div style={{ fontSize: 13, color: "#1e3a5f" }}>{listing.specs}</div>
            </div>
          )}

          {/* Admin Credit Input */}
          {listing.status !== "sold" && listing.status !== "rejected" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                Credit to Issue (KES) — for marking as Sold
              </label>
              <input
                type="number"
                value={creditInput}
                onChange={e => setCreditInput(e.target.value)}
                placeholder="Enter credit amount"
                style={{
                  width: "100%", border: "1px solid #d1d5db", borderRadius: 10,
                  padding: "10px 14px", fontSize: 14, boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Rejection Reason */}
          {listing.status !== "sold" && listing.status !== "rejected" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                Rejection Reason (if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={2}
                placeholder="Reason for rejection..."
                style={{
                  width: "100%", border: "1px solid #d1d5db", borderRadius: 10,
                  padding: "10px 14px", fontSize: 13, resize: "vertical", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {listing.status === "pending_verification" && (
              <>
                <button 
                  onClick={() => handleAction("listed")} 
                  disabled={loading || isUpdating} 
                  style={buttonStyle("#1d4ed8")}
                >
                  ✅ Approve & List
                </button>
                <button 
                  onClick={() => handleAction("rejected")} 
                  disabled={loading || isUpdating} 
                  style={buttonStyle("#dc2626")}
                >
                  ✗ Reject
                </button>
              </>
            )}
            {listing.status === "listed" && (
              <button 
                onClick={() => handleAction("sold")} 
                disabled={loading || isUpdating} 
                style={buttonStyle("#15803d")}
              >
                💰 Mark as Sold
              </button>
            )}
            {listing.status === "rejected" && (
              <button 
                onClick={() => handleAction("listed")} 
                disabled={loading || isUpdating} 
                style={buttonStyle("#1d4ed8")}
              >
                ↩ Re-list Device
              </button>
            )}
            {listing.status === "sold" && (
              <div style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                ✅ Sold — Credit issued: KES {(listing.credit_issued_kes || 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const buttonStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});