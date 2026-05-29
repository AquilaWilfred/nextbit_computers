"use client";

import { useState, useMemo, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type DeviceType = "laptop" | "desktop" | "tablet" | "monitor" | "printer" | "other" | "phone" | "headphones" | "camera";
type Condition = "excellent" | "good" | "fair";
type Status = "pending_verification" | "listed" | "sold" | "rejected";

interface AdminListing {
  id: number;
  listing_number: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  condition: Condition;
  asking_price_kes: number;
  status: Status;
  credit_issued_kes: number | null;
  created_at: string;
  specs?: string;
  images?: string[];
  drop_branch?: string;
  seller_name?: string;
  seller_rating?: number;
  views?: number;
  location?: string;
  user_id: number;
  user_email: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  sold_at?: string;
}

interface AdminStats {
  total_listings: number;
  pending_listings: number;
  listed_listings: number;
  sold_listings: number;
  rejected_listings: number;
  total_gmv: number;
  total_credit_issued: number;
  total_views: number;
  avg_price: number;
  device_breakdown: Record<string, number>;
  branches: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEVICE_LABELS: Record<DeviceType, string> = {
  laptop: "Laptop", desktop: "Desktop / PC", tablet: "Tablet",
  monitor: "Monitor", printer: "Printer", other: "Other",
  phone: "Smartphone", headphones: "Headphones", camera: "Camera",
};

const CONDITION_META: Record<Condition, { label: string; badgeColor: string; multiplier: number }> = {
  excellent: { label: "Excellent", badgeColor: "#16a34a", multiplier: 1.0 },
  good:      { label: "Good",      badgeColor: "#2563eb", multiplier: 0.8 },
  fair:      { label: "Fair",      badgeColor: "#d97706", multiplier: 0.6 },
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  pending_verification: { label: "Pending",  color: "#b45309", bg: "#fef3c7" },
  listed:               { label: "Live",     color: "#1d4ed8", bg: "#dbeafe" },
  sold:                 { label: "Sold",     color: "#15803d", bg: "#dcfce7" },
  rejected:             { label: "Rejected", color: "#b91c1c", bg: "#fee2e2" },
};

// ─── API Service ────────────────────────────────────────────────────────────

const adminTradeInApi = {
  async getStats(): Promise<AdminStats> {
    const res = await fetch('/api/admin/tradein/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
  
  async getListings(params: {
    status?: string;
    device_type?: string;
    branch?: string;
    search?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminListing[]> {
    const urlParams = new URLSearchParams();
    if (params.status && params.status !== 'all') urlParams.append('status', params.status);
    if (params.device_type && params.device_type !== 'all') urlParams.append('device_type', params.device_type);
    if (params.branch && params.branch !== 'all') urlParams.append('branch', params.branch);
    if (params.search) urlParams.append('search', params.search);
    if (params.sort_by) urlParams.append('sort_by', params.sort_by);
    if (params.limit) urlParams.append('limit', params.limit.toString());
    if (params.offset) urlParams.append('offset', params.offset.toString());
    
    const res = await fetch(`/api/admin/tradein/listings?${urlParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch listings');
    return res.json();
  },
  
  async updateStatus(id: number, status: Status, credit_amount?: number, rejection_reason?: string): Promise<void> {
    const res = await fetch(`/api/admin/tradein/listings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, credit_amount, rejection_reason }),
    });
    if (!res.ok) throw new Error('Failed to update status');
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string | number; sub?: string; accent: string;
}) {
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
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

function _parseImages(raw: any): string[] {
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      const out: string[] = [];
      for (const item of raw) {
        if (!item) continue;
        if (typeof item === "string") out.push(item);
        else if (typeof item === "object") {
          const url = item.url || item.src || item.path || item.filename;
          if (typeof url === "string" && url) out.push(url);
        }
      }
      return out;
    }
    if (typeof raw === "string") {
      // maybe a JSON string
      try {
        const parsed = JSON.parse(raw);
        return _parseImages(parsed as any);
      } catch (e) {
        return [];
      }
    }
  } catch (e) {
    return [];
  }
  return [];
}

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      background: m.bg, color: m.color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function ConditionDot({ condition }: { condition: Condition }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, color: CONDITION_META[condition].badgeColor,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: CONDITION_META[condition].badgeColor,
        display: "inline-block",
      }} />
      {CONDITION_META[condition].label}
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  item, onClose, onStatusChange,
}: {
  item: AdminListing;
  onClose: () => void;
  onStatusChange: (id: number, status: Status, credit?: number, reason?: string) => Promise<void>;
}) {
  const [creditInput, setCreditInput] = useState(item.credit_issued_kes?.toString() || "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async (newStatus: Status) => {
    setLoading(true);
    try {
      const credit = newStatus === "sold" ? parseInt(creditInput || "0") : undefined;
      const reason = newStatus === "rejected" ? rejectionReason : undefined;
      await onStatusChange(item.id, newStatus, credit, reason);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

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
              {item.brand} {item.model}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {item.listing_number} · {DEVICE_LABELS[item.device_type]}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={item.status} />
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
            <img
              src={_parseImages(item.images)[0] || "https://placehold.co/600x400/2563EB/white?text=Device"}
              alt={item.model}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Seller", item.seller_name || "—"],
              ["Email", item.user_email],
              ["Rating", item.seller_rating ? `⭐ ${item.seller_rating}` : "—"],
              ["Condition", CONDITION_META[item.condition].label],
              ["Asking Price", `KES ${item.asking_price_kes.toLocaleString()}`],
              ["Drop-off Branch", item.drop_branch || "—"],
              ["Location", item.location || "—"],
              ["Views", item.views?.toString() || "0"],
              ["Listed", new Date(item.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} style={{
                background: "#f9fafb", borderRadius: 10, padding: "10px 14px",
              }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Specs */}
          {item.specs && (
            <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#0369a1", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Specifications</div>
              <div style={{ fontSize: 13, color: "#1e3a5f" }}>{item.specs}</div>
            </div>
          )}

          {/* Admin Credit Input */}
          {item.status !== "sold" && item.status !== "rejected" && (
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
          {item.status !== "sold" && item.status !== "rejected" && (
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
            {item.status === "pending_verification" && (<>
              <button onClick={() => handleAction("listed")} disabled={loading} style={btnStyle("#1d4ed8")}>✅ Approve & List</button>
              <button onClick={() => handleAction("rejected")} disabled={loading} style={btnStyle("#dc2626")}>✗ Reject</button>
            </>)}
            {item.status === "listed" && (
              <button onClick={() => handleAction("sold")} disabled={loading} style={btnStyle("#15803d")}>💰 Mark as Sold</button>
            )}
            {item.status === "rejected" && (
              <button onClick={() => handleAction("listed")} disabled={loading} style={btnStyle("#1d4ed8")}>↩ Re-list Device</button>
            )}
            {item.status === "sold" && (
              <div style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                ✅ Sold — Credit issued: KES {(item.credit_issued_kes || 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 10,
    padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  };
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function TradeInAdminPage() {
  const [items, setItems] = useState<AdminListing[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | DeviceType>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "views">("date");
  const [selected, setSelected] = useState<AdminListing | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, deviceFilter, branchFilter, search, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, listingsData] = await Promise.all([
        adminTradeInApi.getStats(),
        adminTradeInApi.getListings({
          status: statusFilter,
          device_type: deviceFilter,
          branch: branchFilter,
          search: search || undefined,
          sort_by: sortBy,
        }),
      ]);
      setStats(statsData);
      setItems(listingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: Status, credit?: number, reason?: string) => {
    try {
      await adminTradeInApi.updateStatus(id, status, credit, reason);
      await loadData(); // Reload all data
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const branches = stats?.branches || [];

  const topDeviceType = stats?.device_breakdown 
    ? Object.entries(stats.device_breakdown).sort((a, b) => b[1] - a[1])[0]
    : null;

  if (loading && !stats) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>

        {/* Page Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Trade-In Management
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Review, approve, and manage all device submissions across NextBit Marketplace.
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard icon="📦" label="Total Submissions" value={stats.total_listings} accent="#6366f1" />
            <StatCard icon="⏳" label="Pending Verification" value={stats.pending_listings} sub="Needs review" accent="#f59e0b" />
            <StatCard icon="🟢" label="Live Listings" value={stats.listed_listings} accent="#2563eb" />
            <StatCard icon="✅" label="Sold Devices" value={stats.sold_listings} accent="#16a34a" />
            <StatCard icon="✗" label="Rejected" value={stats.rejected_listings} accent="#dc2626" />
            <StatCard icon="💰" label="Total Credit Issued" value={`KES ${stats.total_credit_issued.toLocaleString()}`} accent="#0891b2" />
            <StatCard icon="📊" label="Total GMV (Sold)" value={`KES ${stats.total_gmv.toLocaleString()}`} accent="#7c3aed" />
            <StatCard icon="👁️" label="Total Listing Views" value={stats.total_views.toLocaleString()} accent="#db2777" />
            <StatCard icon="📈" label="Avg. Asking Price" value={`KES ${stats.avg_price.toLocaleString()}`} accent="#0d9488" />
            <StatCard icon="📱" label="Top Device Type" value={topDeviceType ? DEVICE_LABELS[topDeviceType[0] as DeviceType] : "—"} sub={topDeviceType ? `${topDeviceType[1]} submissions` : ""} accent="#ea580c" />
          </div>
        )}

        {/* Device Type Breakdown Bar */}
        {stats && stats.device_breakdown && (
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 16, padding: "18px 24px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Submissions by Device Type</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(stats.device_breakdown)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const pct = Math.round((v / stats.total_listings) * 100);
                  return (
                    <div key={k} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      background: "#f8fafc", border: "1px solid #e5e7eb",
                      borderRadius: 10, padding: "8px 14px", minWidth: 72,
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{v}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{DEVICE_LABELS[k as DeviceType]}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{pct}%</div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Filters Row */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
          padding: "14px 18px", alignItems: "center",
        }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search by ID, brand, model, seller…"
            style={{
              border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "8px 14px", fontSize: 13, minWidth: 220, flex: 1,
            }}
          />

          {/* Status Filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | Status)}
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
            <option value="all">All Statuses</option>
            <option value="pending_verification">Pending</option>
            <option value="listed">Listed</option>
            <option value="sold">Sold</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Device Filter */}
          <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value as "all" | DeviceType)}
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
            <option value="all">All Devices</option>
            {(Object.keys(DEVICE_LABELS) as DeviceType[]).map(k => (
              <option key={k} value={k}>{DEVICE_LABELS[k]}</option>
            ))}
          </select>

          {/* Branch Filter */}
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as "date" | "price" | "views")}
            style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
            <option value="date">Sort: Newest</option>
            <option value="price">Sort: Price ↓</option>
            <option value="views">Sort: Most Views</option>
          </select>

          <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {items.length} results
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "56px 2fr 1fr 1fr 1fr 1fr 1fr 100px",
            gap: 0,
            padding: "12px 18px",
            background: "#f8fafc",
            borderBottom: "1px solid #e5e7eb",
            fontSize: 11, fontWeight: 700, color: "#6b7280",
            textTransform: "uppercase", letterSpacing: "0.05em",
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
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600 }}>No submissions match your filters.</div>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 2fr 1fr 1fr 1fr 1fr 1fr 100px",
                  alignItems: "center",
                  gap: 0,
                  padding: "13px 18px",
                  borderBottom: idx < items.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                onClick={() => setSelected(item)}
              >
                {/* Thumbnail */}
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                  <img
                    src={_parseImages(item.images)[0] || "https://placehold.co/80x80/2563EB/white?text=D"}
                    alt={item.model}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                {/* Device */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
                    {item.brand} {item.model}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {item.listing_number} · {DEVICE_LABELS[item.device_type]}
                  </div>
                </div>

                {/* Seller */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.seller_name || "—"}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {item.seller_rating ? `⭐ ${item.seller_rating}` : ""}
                    {item.drop_branch ? ` · ${item.drop_branch}` : ""}
                  </div>
                </div>

                {/* Condition */}
                <div><ConditionDot condition={item.condition} /></div>

                {/* Price */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    KES {item.asking_price_kes.toLocaleString()}
                  </div>
                  {item.credit_issued_kes && (
                    <div style={{ fontSize: 11, color: "#16a34a" }}>
                      Paid: KES {item.credit_issued_kes.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div><StatusBadge status={item.status} /></div>

                {/* Views */}
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {item.views ? `👁 ${item.views}` : "—"}
                </div>

                {/* Action button */}
                <div onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setSelected(item)}
                    style={{
                      background: "#1e293b", color: "#fff",
                      border: "none", borderRadius: 8,
                      padding: "7px 14px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Review →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, color: "#c4cdd6", fontSize: 12 }}>
          NextBit Admin · Trade-In Module · {new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}