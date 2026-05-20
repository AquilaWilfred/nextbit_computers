"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tier = "gold" | "platinum" | "diamond";
type MemberStatus = "active" | "inactive" | "pending";
type ServiceCategory = "shipping" | "support" | "concierge" | "exclusive";
type PurchaseStatus = "paid" | "pending" | "failed" | "refunded";
type ShipmentStatus = "pending" | "in_transit" | "delivered" | "cancelled";
type ShipmentType = "express" | "international";

interface VIPMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  tier: Tier;
  status: MemberStatus;
  joinedAt: string;
  expiresAt: string;
  autoRenewal: boolean;
  totalSpent: number;
  servicesPurchased: number;
  location: string;
}

interface ServicePurchase {
  id: number;
  memberName: string;
  serviceName: string;
  amount: number;
  status: PurchaseStatus;
  purchasedAt: string;
  category: ServiceCategory;
}

interface ShipmentRequest {
  id: number;
  memberName: string;
  type: ShipmentType;
  destination: string;
  weight: number;
  declaredValue: number;
  status: ShipmentStatus;
  createdAt: string;
  estimatedDelivery: string;
  trackingNumber?: string;
  cost: number;
}

interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  inactiveMembers: number;
  goldMembers: number;
  platinumMembers: number;
  diamondMembers: number;
  totalMrr: number;
  totalSpent: number;
  totalServiceRevenue: number;
  pendingPurchases: number;
  shipmentsInTransit: number;
  shipmentsDelivered: number;
  shipmentRevenue: number;
}

// ─── API Service ───────────────────────────────────────────────────────────

const API_BASE = "/api/admin/vip";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

const formatCurrency = (value: number | null | undefined) => Number(value ?? 0).toLocaleString();

// ─── Response Mappers (backend returns snake_case) ─────────────────────────
function mapMember(raw: any): VIPMember {
  return {
    id: raw.id,
    name: raw.name ?? raw.full_name ?? raw.fullName ?? raw.email ?? "Unknown",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    tier: raw.tier,
    status: raw.status,
    joinedAt: raw.joined_at ?? raw.joinedAt,
    expiresAt: raw.expires_at ?? raw.expiresAt,
    autoRenewal: raw.auto_renewal ?? raw.autoRenewal ?? false,
    totalSpent: raw.total_spent ?? raw.totalSpent ?? 0,
    servicesPurchased: raw.services_purchased ?? raw.servicesPurchased ?? 0,
    location: raw.location ?? "",
  };
}

function mapStats(raw: any): AdminStats {
  return {
    totalMembers: raw.total_members ?? raw.totalMembers ?? 0,
    activeMembers: raw.active_members ?? raw.activeMembers ?? 0,
    pendingMembers: raw.pending_members ?? raw.pendingMembers ?? 0,
    inactiveMembers: raw.inactive_members ?? raw.inactiveMembers ?? 0,
    goldMembers: raw.gold_members ?? raw.goldMembers ?? 0,
    platinumMembers: raw.platinum_members ?? raw.platinumMembers ?? 0,
    diamondMembers: raw.diamond_members ?? raw.diamondMembers ?? 0,
    totalMrr: raw.total_mrr ?? raw.totalMrr ?? 0,
    totalSpent: raw.total_spent ?? raw.totalSpent ?? 0,
    totalServiceRevenue: raw.total_service_revenue ?? raw.totalServiceRevenue ?? 0,
    pendingPurchases: raw.pending_purchases ?? raw.pendingPurchases ?? 0,
    shipmentsInTransit: raw.shipments_in_transit ?? raw.shipmentsInTransit ?? 0,
    shipmentsDelivered: raw.shipments_delivered ?? raw.shipmentsDelivered ?? 0,
    shipmentRevenue: raw.shipment_revenue ?? raw.shipmentRevenue ?? 0,
  };
}

function mapPurchase(raw: any): ServicePurchase {
  return {
    id: raw.id,
    memberName: raw.member_name ?? raw.memberName ?? "",
    serviceName: raw.service_name ?? raw.serviceName ?? "",
    amount: raw.amount ?? 0,
    status: raw.status,
    purchasedAt: raw.purchased_at ?? raw.purchasedAt,
    category: raw.category,
  };
}

function mapShipment(raw: any): ShipmentRequest {
  return {
    id: raw.id,
    memberName: raw.member_name ?? raw.memberName ?? "",
    type: raw.type,
    destination: raw.destination,
    weight: raw.weight ?? 0,
    declaredValue: raw.declared_value ?? raw.declaredValue ?? 0,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
    estimatedDelivery: raw.estimated_delivery ?? raw.estimatedDelivery,
    trackingNumber: raw.tracking_number ?? raw.trackingNumber,
    cost: raw.cost ?? 0,
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_META: Record<Tier, { label: string; color: string; bg: string; accent: string; price: number }> = {
  gold: { label: "Gold", color: "#92400e", bg: "#fef3c7", accent: "#d97706", price: 2500 },
  platinum: { label: "Platinum", color: "#1e40af", bg: "#dbeafe", accent: "#2563eb", price: 7500 },
  diamond: { label: "Diamond", color: "#6b21a8", bg: "#f3e8ff", accent: "#7c3aed", price: 15000 },
};

const STATUS_META: Record<MemberStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#15803d", bg: "#dcfce7" },
  inactive: { label: "Inactive", color: "#6b7280", bg: "#f3f4f6" },
  pending: { label: "Pending", color: "#b45309", bg: "#fef3c7" },
};

const PURCHASE_STATUS_META: Record<PurchaseStatus, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "#15803d", bg: "#dcfce7" },
  pending: { label: "Pending", color: "#b45309", bg: "#fef3c7" },
  failed: { label: "Failed", color: "#dc2626", bg: "#fee2e2" },
  refunded: { label: "Refunded", color: "#6b7280", bg: "#f3f4f6" },
};

const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#b45309", bg: "#fef3c7" },
  in_transit: { label: "In Transit", color: "#1e40af", bg: "#dbeafe" },
  delivered: { label: "Delivered", color: "#15803d", bg: "#dcfce7" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fee2e2" },
};

type TabKey = "members" | "purchases" | "shipments";

// ─── Helper Components ──────────────────────────────────────────────────────

function SmallBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 14, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 4,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: 4,
        height: "100%", background: accent, borderRadius: "14px 0 0 14px",
      }} />
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

// ─── Member Detail Modal ──────────────────────────────────────────────────────

function MemberModal({ member, onClose, onUpdate }: {
  member: VIPMember;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [tier, setTier] = useState<Tier>(member.tier);
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [autoRenewal, setAutoRenewal] = useState(member.autoRenewal);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ tier, status, auto_renewal: autoRenewal }),
      });
      toast.success("Member updated successfully");
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = Math.max(0, Math.ceil((new Date(member.expiresAt).getTime() - Date.now()) / 86400000));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: "#fff",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{member.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>VIP-{member.id} · {member.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SmallBadge {...TIER_META[member.tier]} />
            <button onClick={onClose} style={{
              background: "#f3f4f6", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Phone", member.phone],
              ["Location", member.location],
              ["Joined", new Date(member.joinedAt).toLocaleDateString()],
              ["Expires", `${new Date(member.expiresAt).toLocaleDateString()} (${daysLeft}d left)`],
              ["Total Spent", `KES ${formatCurrency(member.totalSpent)}`],
              ["Services Used", `${member.servicesPurchased}`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{v}</div>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Membership Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value as Tier)} style={{
              width: "100%", border: "1px solid #d1d5db", borderRadius: 10,
              padding: "10px 14px", fontSize: 14, boxSizing: "border-box",
            }}>
              <option value="gold">Gold — KES 2,500/yr</option>
              <option value="platinum">Platinum — KES 7,500/yr</option>
              <option value="diamond">Diamond — KES 15,000/yr</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Account Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as MemberStatus)} style={{
              width: "100%", border: "1px solid #d1d5db", borderRadius: 10,
              padding: "10px 14px", fontSize: 14, boxSizing: "border-box",
            }}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#f9fafb", borderRadius: 10, padding: "12px 16px",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Auto-Renewal</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Automatically renew when membership expires</div>
            </div>
            <button
              onClick={() => setAutoRenewal(p => !p)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: autoRenewal ? "#2563eb" : "#d1d5db",
                border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: autoRenewal ? 22 : 3,
                width: 18, height: 18, background: "#fff",
                borderRadius: "50%", transition: "left 0.2s",
              }} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, background: "#0f172a", color: "#fff", border: "none",
              borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={onClose} style={{
              flex: 1, background: "#f1f5f9", color: "#374151", border: "none",
              borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function VIPAdminPage() {
  const [members, setMembers] = useState<VIPMember[]>([]);
  const [purchases, setPurchases] = useState<ServicePurchase[]>([]);
  const [shipments, setShipments] = useState<ShipmentRequest[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("members");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [selectedMember, setSelectedMember] = useState<VIPMember | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch all data
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`${API_BASE}/stats`);
      setStats(mapStats(data));
    } catch (err: any) {
      console.error("Failed to load stats", err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tierFilter !== "all") params.set("tier", tierFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const data = await apiFetch<any[]>(`${API_BASE}/members?${params}`);
      setMembers((data || []).map(mapMember));
    } catch (err: any) {
      toast.error(err.message || "Failed to load members");
    }
  }, [tierFilter, statusFilter, search]);

  const fetchPurchases = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>(`${API_BASE}/purchases`);
      setPurchases((data || []).map(mapPurchase));
    } catch (err: any) {
      console.error("Failed to load purchases", err);
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>(`${API_BASE}/shipments`);
      setShipments((data || []).map(mapShipment));
    } catch (err: any) {
      console.error("Failed to load shipments", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchMembers(),
      fetchPurchases(),
      fetchShipments(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchMembers, fetchPurchases, fetchShipments]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle shipment status update
  const updateShipmentStatus = async (id: number, status: ShipmentStatus) => {
    setUpdating(`shipment_${id}`);
    try {
      await apiFetch(`${API_BASE}/shipments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Shipment status updated to ${status}`);
      fetchShipments();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to update shipment status");
    } finally {
      setUpdating(null);
    }
  };

  const handleMemberUpdate = () => {
    fetchMembers();
    fetchStats();
  };

  // Tab button style
  const tabBtn = (key: TabKey): React.CSSProperties => ({
    padding: "9px 20px", borderRadius: 10, border: "none",
    cursor: "pointer", fontSize: 13, fontWeight: 700,
    background: tab === key ? "#0f172a" : "#f1f5f9",
    color: tab === key ? "#fff" : "#374151",
    transition: "all 0.15s",
  });

  if (loading && !stats) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Nav */}
      <div style={{
        background: "#0f172a", color: "#fff", padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 30, height: 30, background: "#d97706",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>👑</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>NextBit Admin</span>
          <span style={{
            background: "rgba(255,255,255,0.07)", color: "#94a3b8",
            fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
          }}>VIP & International Trade</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {stats && stats.pendingMembers > 0 && (
            <div style={{ background: "#d97706", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              ⏳ {stats.pendingMembers} Pending Members
            </div>
          )}
          {stats && stats.pendingPurchases > 0 && (
            <div style={{ background: "#2563eb", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              💳 {stats.pendingPurchases} Pending Purchases
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>VIP Member Management</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Manage memberships, service purchases, and international shipments.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard icon="👥" label="Total Members" value={stats.totalMembers} accent="#6366f1" />
            <StatCard icon="✅" label="Active" value={stats.activeMembers} accent="#16a34a" />
            <StatCard icon="⏳" label="Pending" value={stats.pendingMembers} accent="#d97706" />
            <StatCard icon="⭐" label="Gold" value={stats.goldMembers} sub={`KES 2,500/yr`} accent="#d97706" />
            <StatCard icon="💎" label="Platinum" value={stats.platinumMembers} sub={`KES 7,500/yr`} accent="#2563eb" />
            <StatCard icon="🔮" label="Diamond" value={stats.diamondMembers} sub={`KES 15,000/yr`} accent="#7c3aed" />
            <StatCard icon="💰" label="Annual Revenue (ARR)" value={`KES ${formatCurrency(stats.totalMrr)}`} accent="#0891b2" />
            <StatCard icon="🛒" label="Service Revenue" value={`KES ${formatCurrency(stats.totalServiceRevenue)}`} accent="#db2777" />
            <StatCard icon="✈️" label="Shipments In Transit" value={stats.shipmentsInTransit} accent="#0d9488" />
            <StatCard icon="📦" label="Delivered" value={stats.shipmentsDelivered} accent="#15803d" />
            <StatCard icon="🚚" label="Shipment Revenue" value={`KES ${formatCurrency(stats.shipmentRevenue)}`} accent="#ea580c" />
            <StatCard icon="💳" label="Pending Purchases" value={stats.pendingPurchases} accent="#dc2626" />
          </div>
        )}

        {/* Tier Breakdown Visual */}
        {stats && (
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 14, padding: "16px 20px", marginBottom: 24,
            display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", minWidth: 100 }}>Tier Distribution</div>
            {(["gold", "platinum", "diamond"] as Tier[]).map(t => {
              const count = t === "gold" ? stats.goldMembers : t === "platinum" ? stats.platinumMembers : stats.diamondMembers;
              const pct = stats.totalMembers ? Math.round((count / stats.totalMembers) * 100) : 0;
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    height: 28, width: `${Math.max(pct * 1.5, 20)}px`,
                    background: TIER_META[t].accent, borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff", fontWeight: 800, minWidth: 28,
                  }}>{count}</div>
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                    {TIER_META[t].label} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button style={tabBtn("members")} onClick={() => setTab("members")}>👥 Members ({members.length})</button>
          <button style={tabBtn("purchases")} onClick={() => setTab("purchases")}>💳 Purchases ({purchases.length})</button>
          <button style={tabBtn("shipments")} onClick={() => setTab("shipments")}>✈️ Shipments ({shipments.length})</button>
        </div>

        {/* ── MEMBERS TAB ────────────────────────────────────────────────────── */}
        {tab === "members" && (
          <>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
              padding: "12px 16px", alignItems: "center",
            }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search by name, email, ID…"
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13, flex: 1, minWidth: 200 }}
              />
              <select value={tierFilter} onChange={e => setTierFilter(e.target.value as "all" | Tier)}
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
                <option value="all">All Tiers</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | MemberStatus)}
                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={fetchMembers}
                style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
              >Refresh</button>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{members.length} results</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 90px",
                padding: "11px 18px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
                fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                <span>Member</span><span>Tier</span><span>Status</span>
                <span>Spent</span><span>Services</span><span>Expires</span><span>Action</span>
              </div>
              {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>No members match filters.</div>
              ) : members.map((m, idx) => {
                const daysLeft = Math.ceil((new Date(m.expiresAt).getTime() - Date.now()) / 86400000);
                const expiring = daysLeft <= 30 && m.status === "active";
                return (
                  <div key={m.id} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 90px",
                    alignItems: "center", padding: "13px 18px",
                    borderBottom: idx < members.length - 1 ? "1px solid #f3f4f6" : "none",
                    cursor: "pointer",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setSelectedMember(m)}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>VIP-{m.id} · {m.location}</div>
                    </div>
                    <SmallBadge label={TIER_META[m.tier].label} color={TIER_META[m.tier].color} bg={TIER_META[m.tier].bg} />
                    <SmallBadge {...STATUS_META[m.status]} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>KES {m.totalSpent.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: "#374151" }}>{m.servicesPurchased}</div>
                    <div>
                      <div style={{ fontSize: 12, color: expiring ? "#dc2626" : "#374151", fontWeight: expiring ? 700 : 400 }}>
                        {new Date(m.expiresAt).toLocaleDateString()}
                      </div>
                      {expiring && <div style={{ fontSize: 10, color: "#dc2626" }}>⚠ {daysLeft}d left</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelectedMember(m); }} style={{
                      background: "#0f172a", color: "#fff", border: "none",
                      borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}>Edit →</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── PURCHASES TAB ─────────────────────────────────────────────────── */}
        {tab === "purchases" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr",
              padding: "11px 18px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
              fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <span>ID</span><span>Member · Service</span><span>Category</span>
              <span>Amount</span><span>Status</span><span>Date</span>
            </div>
            {purchases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>No purchases found.</div>
            ) : purchases.map((p, idx) => (
              <div key={p.id} style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr",
                alignItems: "center", padding: "13px 18px",
                borderBottom: idx < purchases.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{p.id}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.memberName}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{p.serviceName}</div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "#374151",
                  textTransform: "capitalize",
                  background: "#f1f5f9", borderRadius: 6, padding: "2px 8px",
                  display: "inline-block",
                }}>{p.category}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>KES {formatCurrency(p.amount)}</div>
                <SmallBadge {...PURCHASE_STATUS_META[p.status]} />
                <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(p.purchasedAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SHIPMENTS TAB ─────────────────────────────────────────────────── */}
        {tab === "shipments" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 120px",
              padding: "11px 18px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
              fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <span>ID</span><span>Member · Destination</span><span>Type</span>
              <span>Cost</span><span>Status</span><span>ETA</span><span>Action</span>
            </div>
            {shipments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>No shipments found.</div>
            ) : shipments.map((s, idx) => (
              <div key={s.id} style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 120px",
                alignItems: "center", padding: "13px 18px",
                borderBottom: idx < shipments.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{s.id}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.memberName}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>📍 {s.destination}</div>
                  {s.trackingNumber && <div style={{ fontSize: 10, color: "#2563eb" }}>🔍 {s.trackingNumber}</div>}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: s.type === "international" ? "#6b21a8" : "#0369a1",
                  background: s.type === "international" ? "#f3e8ff" : "#e0f2fe",
                  borderRadius: 6, padding: "2px 8px", display: "inline-block", textTransform: "uppercase",
                }}>
                  {s.type === "international" ? "✈ Intl" : "⚡ Express"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>KES {formatCurrency(s.cost)}</div>
                <SmallBadge {...SHIPMENT_STATUS_META[s.status]} />
                <div style={{ fontSize: 11, color: "#6b7280" }}>{new Date(s.estimatedDelivery).toLocaleDateString()}</div>
                <select
                  value={s.status}
                  onChange={e => { e.stopPropagation(); updateShipmentStatus(s.id, e.target.value as ShipmentStatus); }}
                  onClick={e => e.stopPropagation()}
                  disabled={updating === `shipment_${s.id}`}
                  style={{
                    border: "1px solid #e5e7eb", borderRadius: 8,
                    padding: "5px 8px", fontSize: 11, cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, color: "#c4cdd6", fontSize: 12 }}>
          NextBit Admin · VIP Module · {new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}
        </div>
      </div>

      {/* Member Modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdate={handleMemberUpdate}
        />
      )}
    </div>
  );
}