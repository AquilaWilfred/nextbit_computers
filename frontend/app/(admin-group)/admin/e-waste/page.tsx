"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// ─── Types (matching backend) ────────────────────────────────────────────────

type DeviceCategory =
  | "laptop" | "desktop" | "monitor" | "printer"
  | "peripheral" | "other" | "battery" | "mobile_phone";

type TicketStatus =
  | "surrendered" | "batched" | "collected"
  | "certified" | "exported" | "recycled";

type ComplianceStandard = "NEMA" | "EU_WEEE" | "BASEL" | "ISO_14001" | "ROHS";

interface SurrenderTicket {
  id: number;
  ticket_number: string;
  serial: string;
  brand: string;
  category: DeviceCategory;
  weight_kg: number;
  status: TicketStatus;
  points_awarded: number;
  nema_ref: string | null;
  weee_ref: string | null;
  basel_permit: string | null;
  co2_saved_kg: number;
  hazardous_materials: string[];
  recycler_name: string;
  recycler_certifications: string[];
  created_at: string;
  collected_at: string | null;
  certified_at: string | null;
  location: string;
  dropoff_branch: string;
  user_name?: string;
  user_email?: string;
}

interface RecyclingCenter {
  id: number;
  name: string;
  location: string;
  distance: number;
  certified: boolean;
  certifications: string[];
  accepts_categories: DeviceCategory[];
  operating_hours: string;
  phone: string;
  email: string;
  description: string;
  waste_types: string[];
  price_range?: string;
  total_collected: number;
  total_weight_kg: number;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  total_tickets: number;
  total_points: number;
  total_co2_saved: number;
  joined_at: string;
  last_activity: string;
  status: "active" | "inactive";
}

interface AdminStats {
  total_tickets: number;
  total_weight_kg: number;
  total_co2_saved: number;
  total_points_awarded: number;
  total_centers: number;
  certified_centers: number;
  status_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  compliance_rate: number;
  nema_count: number;
  weee_count: number;
  basel_count: number;
}

type AdminTab = "overview" | "tickets" | "centers" | "users" | "compliance";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  laptop: "Laptop / Notebook",
  desktop: "Desktop / PC Tower",
  monitor: "Monitor / Display",
  printer: "Printer / Scanner",
  peripheral: "Keyboard, Mouse, Cables",
  other: "Other Electronics",
  battery: "Lithium Battery",
  mobile_phone: "Mobile Phone / Smartphone",
};

const CATEGORY_POINTS: Record<DeviceCategory, number> = {
  laptop: 500,
  desktop: 400,
  monitor: 300,
  printer: 250,
  peripheral: 100,
  other: 50,
  battery: 200,
  mobile_phone: 350,
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  surrendered: "#EF9F27",
  batched: "#378ADD",
  collected: "#1D9E75",
  certified: "#639922",
  exported: "#8B5CF6",
  recycled: "#059669",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  surrendered: "Received at Collection Point",
  batched: "Awaiting NEMA Batch Collection",
  collected: "Collected by Licensed Recycler",
  certified: "Compliance Certificate Issued",
  exported: "Exported (Basel Permit)",
  recycled: "Fully Recycled / Refurbished",
};

// ─── API Service ─────────────────────────────────────────────────────────────

const API_BASE = "/api/admin/ewaste";

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

// ─── Helper Components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = "#059669", icon }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: string;
}) {
  return (
    <div style={{ borderTop: `3px solid ${accent}` }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{label}</div>
          <div className="text-2xl font-black text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + "22", color }}>
      {label}
    </span>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────

export default function EWasteAdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tickets, setTickets] = useState<SurrenderTicket[]>([]);
  const [centers, setCenters] = useState<RecyclingCenter[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filters
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | "all">("all");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<DeviceCategory | "all">("all");
  const [userSearch, setUserSearch] = useState("");

  // Selected items for modals
  const [selectedTicket, setSelectedTicket] = useState<SurrenderTicket | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<RecyclingCenter | null>(null);

  // ── Fetch Functions ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<AdminStats>(`${API_BASE}/stats`);
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load stats", err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (ticketStatusFilter !== "all") params.set("status", ticketStatusFilter);
      if (ticketCategoryFilter !== "all") params.set("category", ticketCategoryFilter);
      if (ticketSearch) params.set("search", ticketSearch);
      
      const data = await apiFetch<SurrenderTicket[]>(`${API_BASE}/tickets?${params}`);
      setTickets(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tickets");
    }
  }, [ticketStatusFilter, ticketCategoryFilter, ticketSearch]);

  const fetchCenters = useCallback(async () => {
    try {
      const data = await apiFetch<RecyclingCenter[]>(`${API_BASE}/centers`);
      setCenters(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load recycling centers");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // Users endpoint - you'll need to implement this in backend
      // For now, we'll derive from tickets
      const ticketsData = await apiFetch<SurrenderTicket[]>(`${API_BASE}/tickets?limit=500`);
      const userMap = new Map<string, AdminUser>();
      
      ticketsData.forEach(t => {
        if (t.user_name && t.user_email && !userMap.has(t.user_email)) {
          userMap.set(t.user_email, {
            id: userMap.size + 1,
            name: t.user_name,
            email: t.user_email,
            total_tickets: ticketsData.filter(t2 => t2.user_email === t.user_email).length,
            total_points: ticketsData.filter(t2 => t2.user_email === t.user_email).reduce((sum, t2) => sum + t2.points_awarded, 0),
            total_co2_saved: ticketsData.filter(t2 => t2.user_email === t.user_email).reduce((sum, t2) => sum + t2.co2_saved_kg, 0),
            joined_at: ticketsData.filter(t2 => t2.user_email === t.user_email).sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0]?.created_at || new Date().toISOString(),
            last_activity: ticketsData.filter(t2 => t2.user_email === t.user_email).sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]?.created_at || new Date().toISOString(),
            status: "active",
          });
        }
      });
      
      setUsers(Array.from(userMap.values()));
    } catch (err: any) {
      console.error("Failed to load users", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchTickets(),
      fetchCenters(),
      fetchUsers(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchTickets, fetchCenters, fetchUsers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Update Ticket Status ───────────────────────────────────────────────────

  const updateTicketStatus = async (ticketId: number, status: TicketStatus) => {
    setUpdating(`ticket_${ticketId}`);
    try {
      await apiFetch(`${API_BASE}/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Ticket status updated to ${STATUS_LABEL[status]}`);
      fetchTickets();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    } finally {
      setUpdating(null);
    }
  };

  // ── Aggregated Values ─────────────────────────────────────────────────────

  const totalTickets = stats?.total_tickets || 0;
  const totalWeight = stats?.total_weight_kg || 0;
  const totalCO2 = stats?.total_co2_saved || 0;
  const totalPoints = stats?.total_points_awarded || 0;
  const totalCenters = stats?.total_centers || 0;
  const certifiedCenters = stats?.certified_centers || 0;
  const totalCenterCollected = centers.reduce((s, c) => s + (c.total_collected || 0), 0);
  const totalCenterWeight = centers.reduce((s, c) => s + (c.total_weight_kg || 0), 0);
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.status === "active").length;
  const withNEMA = stats?.nema_count || 0;
  const withWEEE = stats?.weee_count || 0;
  const withBasel = stats?.basel_count || 0;
  const complianceRate = stats?.compliance_rate || 0;

  const byStatus = (status: TicketStatus) => stats?.status_breakdown?.[status] || 0;
  const byCategory = (category: DeviceCategory) => stats?.category_breakdown?.[category] || 0;

  // ── Filtered Data ─────────────────────────────────────────────────────────

  const filteredTickets = tickets.filter(t => {
    const q = ticketSearch.toLowerCase();
    const matchQ = !q || 
      t.ticket_number.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q) ||
      t.serial.toLowerCase().includes(q) ||
      (t.user_name || "").toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q);
    const matchStatus = ticketStatusFilter === "all" || t.status === ticketStatusFilter;
    const matchCat = ticketCategoryFilter === "all" || t.category === ticketCategoryFilter;
    return matchQ && matchStatus && matchCat;
  });

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "tickets", label: `Tickets (${totalTickets})`, icon: "🎫" },
    { id: "centers", label: `Recyclers (${totalCenters})`, icon: "🏭" },
    { id: "users", label: `Clients (${totalUsersCount})`, icon: "👥" },
    { id: "compliance", label: "Compliance", icon: "📜" },
  ];

  const fmt = (n: number) => n.toLocaleString();
  const pct = (n: number, d: number) => d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`;

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Top Nav */}
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-700 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-black text-lg tracking-tight">♻ NEXTBIT</span>
          <span className="text-gray-600 text-xs">|</span>
          <span className="text-gray-400 text-xs uppercase tracking-widest">Admin Console</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-900 text-emerald-300 px-3 py-1 rounded-full">🟢 Live</span>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString("en-KE", { dateStyle: "medium" })}</span>
          <button
            onClick={fetchAllData}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full transition"
          >
            Refresh
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">A</div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeTab === tab.id
                ? "bg-gray-900 text-white shadow"
                : "text-gray-500 hover:bg-gray-100"
              }`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Tickets" value={fmt(totalTickets)} sub={`${byStatus("recycled")} fully recycled`} icon="🎫" accent="#059669" />
              <StatCard label="Total Weight (kg)" value={`${totalWeight.toFixed(1)} kg`} sub={`${totalCenterWeight.toFixed(1)} kg via centers`} icon="⚖️" accent="#378ADD" />
              <StatCard label="CO₂ Saved (kg)" value={fmt(totalCO2)} sub="Across all tickets" icon="🌱" accent="#1D9E75" />
              <StatCard label="Points Issued" value={fmt(totalPoints)} sub={`${totalUsersCount} clients`} icon="⭐" accent="#EF9F27" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Registered Clients" value={totalUsersCount} sub={`${activeUsersCount} active`} icon="👥" accent="#639922" />
              <StatCard label="Recycling Centers" value={totalCenters} sub={`${certifiedCenters} NEMA certified`} icon="🏭" accent="#8B5CF6" />
              <StatCard label="Devices Collected" value={fmt(totalCenterCollected)} sub="By all centers" icon="📦" accent="#EF9F27" />
              <StatCard label="Compliance Rate" value={`${complianceRate}%`} sub={`${withNEMA} NEMA · ${withWEEE} WEEE · ${withBasel} Basel`} icon="📜" accent="#059669" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Ticket Status Breakdown</h3>
                <div className="space-y-2">
                  {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(status => {
                    const count = byStatus(status);
                    const w = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{STATUS_LABEL[status]}</span>
                          <span className="font-bold text-gray-800">{count} <span className="font-normal text-gray-400">({pct(count, totalTickets)})</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: STATUS_COLOR[status] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Device Category Counts</h3>
                <div className="space-y-2">
                  {(Object.keys(CATEGORY_LABELS) as DeviceCategory[]).map(cat => {
                    const count = byCategory(cat);
                    if (count === 0) return null;
                    const w = (count / totalTickets) * 100;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{CATEGORY_LABELS[cat]}</span>
                          <span className="font-bold text-gray-800">{count} <span className="font-normal text-gray-400">· {CATEGORY_POINTS[cat]}pts</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Recycling Center Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 uppercase border-b border-gray-100">
                      <th className="text-left pb-2 pr-4">Center</th>
                      <th className="text-right pb-2 pr-4">Devices</th>
                      <th className="text-right pb-2 pr-4">Weight (kg)</th>
                      <th className="text-left pb-2">Certifications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {centers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-800">{c.name}</td>
                        <td className="py-2 pr-4 text-right font-bold text-emerald-700">{c.total_collected}</td>
                        <td className="py-2 pr-4 text-right text-blue-700 font-bold">{c.total_weight_kg.toFixed(1)}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {c.certifications.slice(0, 2).map(cert => <Badge key={cert} label={cert} color="#059669" />)}
                            {c.certifications.length > 2 && <span className="text-[9px] text-gray-400">+{c.certifications.length - 2}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200">
                    <tr>
                      <td className="pt-2 pr-4 font-black text-gray-800">TOTAL</td>
                      <td className="pt-2 pr-4 text-right font-black text-emerald-700">{totalCenterCollected}</td>
                      <td className="pt-2 pr-4 text-right font-black text-blue-700">{totalCenterWeight.toFixed(1)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TICKETS ── */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
              <input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                placeholder="Search by ID, brand, serial, client, location…"
                className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <select value={ticketStatusFilter} onChange={e => setTicketStatusFilter(e.target.value as any)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Statuses</option>
                {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(s =>
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <select value={ticketCategoryFilter} onChange={e => setTicketCategoryFilter(e.target.value as any)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as DeviceCategory[]).map(c =>
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <button onClick={fetchTickets} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Search</button>
              <span className="text-xs text-gray-400 font-semibold">{filteredTickets.length} results</span>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(s => (
                <button key={s} onClick={() => setTicketStatusFilter(s === ticketStatusFilter ? "all" : s)}
                  className={`rounded-lg p-2 text-center border transition ${ticketStatusFilter === s ? "border-gray-900 bg-gray-900 text-white" : "bg-white border-gray-200 hover:border-gray-400"}`}>
                  <div className="text-lg font-black" style={{ color: ticketStatusFilter === s ? "white" : STATUS_COLOR[s] }}>{byStatus(s)}</div>
                  <div className="text-[9px] leading-tight mt-0.5 text-gray-400 truncate">{s.toUpperCase()}</div>
                </button>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-500 uppercase tracking-widest">
                      {["ID", "Client", "Device", "Category", "Weight", "CO₂", "Points", "Status", "References", "Submitted", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTickets.map(t => (
                      <tr key={t.id} className="hover:bg-emerald-50/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-gray-800">{t.ticket_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{t.user_name}</div>
                          <div className="text-gray-400">{t.user_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{t.brand}</div>
                          <div className="text-gray-400 font-mono">{t.serial}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{CATEGORY_LABELS[t.category]}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">{t.weight_kg}kg</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{t.co2_saved_kg}kg</td>
                        <td className="px-4 py-3 text-right text-amber-600 font-bold">+{t.points_awarded}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                            style={{ background: STATUS_COLOR[t.status] + "22", color: STATUS_COLOR[t.status] }}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {t.nema_ref && <span className="text-[9px] text-emerald-700 font-mono">🇰🇪 {t.nema_ref}</span>}
                            {t.weee_ref && <span className="text-[9px] text-blue-700 font-mono">🇪🇺 {t.weee_ref}</span>}
                            {t.basel_permit && <span className="text-[9px] text-purple-700 font-mono">🌍 {t.basel_permit}</span>}
                            {!t.nema_ref && !t.weee_ref && !t.basel_permit && <span className="text-[9px] text-gray-400">Pending</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedTicket(t)}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold whitespace-nowrap">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs font-bold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-gray-700">TOTALS ({filteredTickets.length} tickets)</td>
                      <td className="px-4 py-3 text-right text-gray-800">{filteredTickets.reduce((s, t) => s + t.weight_kg, 0).toFixed(1)}kg</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{filteredTickets.reduce((s, t) => s + t.co2_saved_kg, 0)}kg</td>
                      <td className="px-4 py-3 text-right text-amber-600">+{filteredTickets.reduce((s, t) => s + t.points_awarded, 0)}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CENTERS ── */}
        {activeTab === "centers" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Centers" value={totalCenters} icon="🏭" accent="#8B5CF6" />
              <StatCard label="Certified Centers" value={certifiedCenters} sub={pct(certifiedCenters, totalCenters) + " certified"} icon="✅" accent="#059669" />
              <StatCard label="Total Devices Handled" value={fmt(totalCenterCollected)} icon="📦" accent="#378ADD" />
              <StatCard label="Total Weight (kg)" value={totalCenterWeight.toFixed(1)} icon="⚖️" accent="#EF9F27" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {centers.map(center => {
                const centerCO2 = tickets.filter(t => t.recycler_name === center.name).reduce((s, t) => s + t.co2_saved_kg, 0);
                return (
                  <div key={center.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{center.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">📍 {center.location} · {center.distance}km</p>
                      </div>
                      {center.certified && <Badge label="✓ CERTIFIED" color="#059669" />}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-black text-emerald-700">{center.total_collected}</div>
                        <div className="text-[9px] text-gray-400 uppercase">Devices</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-black text-blue-700">{center.total_weight_kg}</div>
                        <div className="text-[9px] text-gray-400 uppercase">kg</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-black text-amber-600">{centerCO2}</div>
                        <div className="text-[9px] text-gray-400 uppercase">CO₂ kg</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {center.certifications.map(cert => <Badge key={cert} label={cert} color="#378ADD" />)}
                    </div>

                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>🕒 {center.operating_hours}</div>
                      <div>📞 {center.phone}</div>
                      <div>✉️ {center.email}</div>
                      {center.price_range && <div>💰 {center.price_range}</div>}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-[10px] text-gray-400 uppercase mb-1">Accepts</div>
                      <div className="flex flex-wrap gap-1">
                        {center.accepts_categories.slice(0, 4).map(c => (
                          <span key={c} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{c.replace("_", " ")}</span>
                        ))}
                        {center.accepts_categories.length > 4 && <span className="text-[9px] text-gray-400">+{center.accepts_categories.length - 4}</span>}
                      </div>
                    </div>

                    <button onClick={() => setSelectedCenter(center)}
                      className="mt-3 w-full text-sm bg-gray-900 text-white py-2 rounded-lg font-semibold hover:bg-gray-800 transition">
                      Full Report →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Clients" value={totalUsersCount} icon="👥" accent="#8B5CF6" />
              <StatCard label="Active Clients" value={activeUsersCount} sub={pct(activeUsersCount, totalUsersCount) + " active"} icon="🟢" accent="#059669" />
              <StatCard label="Total Points Issued" value={fmt(totalPoints)} icon="⭐" accent="#EF9F27" />
              <StatCard label="Total CO₂ by Clients" value={fmt(totalCO2) + " kg"} icon="🌱" accent="#1D9E75" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex gap-3">
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search clients by name or email…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <span className="text-xs text-gray-400 self-center font-semibold">{filteredUsers.length} clients</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-gray-500 uppercase tracking-widest">
                      {["Client", "Tickets", "Points Earned", "CO₂ Saved", "Status", "Joined", "Last Active", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-emerald-50/40 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{u.name}</div>
                              <div className="text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-gray-800">{u.total_tickets}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">{fmt(u.total_points)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(u.total_co2_saved)} kg</td>
                        <td className="px-4 py-3">
                          <Badge label={u.status.toUpperCase()} color={u.status === "active" ? "#059669" : "#9CA3AF"} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">{new Date(u.joined_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(u.last_activity).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedUser(u)}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">TOTALS</td>
                      <td className="px-4 py-3 text-center text-gray-800">{totalUsersCount}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmt(totalPoints)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(totalCO2)} kg</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPLIANCE ── */}
        {activeTab === "compliance" && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="NEMA References" value={withNEMA} sub={pct(withNEMA, totalTickets) + " of tickets"} icon="🇰🇪" accent="#059669" />
              <StatCard label="EU WEEE References" value={withWEEE} sub={pct(withWEEE, totalTickets) + " of tickets"} icon="🇪🇺" accent="#378ADD" />
              <StatCard label="Basel Permits" value={withBasel} sub={pct(withBasel, totalTickets) + " of tickets"} icon="🌍" accent="#8B5CF6" />
              <StatCard label="Overall Compliance" value={`${complianceRate}%`} sub="Across all standards" icon="📜" accent="#EF9F27" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Compliance Standards</h3>
                {[
                  { label: "NEMA / EMCA (Kenya)", count: withNEMA, color: "#059669", icon: "🇰🇪", desc: "National Environment Management Authority" },
                  { label: "EU WEEE Directive", count: withWEEE, color: "#378ADD", icon: "🇪🇺", desc: "2012/19/EU · Waste Electrical & Electronic Equipment" },
                  { label: "Basel Convention", count: withBasel, color: "#8B5CF6", icon: "🌍", desc: "Transboundary movement of hazardous waste" },
                  { label: "ISO 14001:2015", count: certifiedCenters, color: "#EF9F27", icon: "📜", desc: "Environmental Management System (centers)" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: pct(item.count, totalTickets), background: item.color }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-gray-800">{item.count}</div>
                      <div className="text-[9px] text-gray-400">{pct(item.count, totalTickets)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Tickets Pending Compliance</h3>
                <div className="space-y-2">
                  {tickets.filter(t => !t.nema_ref || !t.weee_ref).slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <span className="font-mono font-bold text-xs text-amber-700">{t.ticket_number}</span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-800">{t.brand} {CATEGORY_LABELS[t.category]}</div>
                        <div className="flex gap-1 mt-0.5">
                          {!t.nema_ref && <Badge label="No NEMA" color="#EF9F27" />}
                          {!t.weee_ref && <Badge label="No WEEE" color="#378ADD" />}
                          {!t.basel_permit && t.status === "exported" && <Badge label="No Basel" color="#8B5CF6" />}
                        </div>
                      </div>
                      <Badge label={t.status.toUpperCase()} color={STATUS_COLOR[t.status]} />
                    </div>
                  ))}
                  {tickets.filter(t => !t.nema_ref || !t.weee_ref).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">All tickets are fully compliant ✅</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Hazardous Materials Handled</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  tickets.flatMap(t => t.hazardous_materials || []).reduce((acc, m) => {
                    acc[m] = (acc[m] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([mat, count]) => (
                  <div key={mat} className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="text-xs font-semibold text-red-800">{mat}</div>
                    <div className="text-xl font-black text-red-600 mt-1">{count}</div>
                    <div className="text-[9px] text-red-400">occurrences</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Ticket Detail Modal ── */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <div className="font-black text-lg font-mono">{selectedTicket.ticket_number}</div>
                <div className="text-xs text-gray-400 mt-0.5">{selectedTicket.user_name} · {selectedTicket.location}</div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Brand", selectedTicket.brand],
                  ["Serial", selectedTicket.serial],
                  ["Category", CATEGORY_LABELS[selectedTicket.category]],
                  ["Weight", `${selectedTicket.weight_kg} kg`],
                  ["CO₂ Saved", `${selectedTicket.co2_saved_kg} kg`],
                  ["Points", `+${selectedTicket.points_awarded}`],
                  ["Recycler", selectedTicket.recycler_name],
                  ["Client Email", selectedTicket.user_email || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[9px] text-gray-400 uppercase">{k}</div>
                    <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate">{v}</div>
                  </div>
                ))}
              </div>

              <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Compliance References</div>
                <div className="flex justify-between"><span className="text-gray-500">NEMA Ref</span><span className="font-mono text-xs">{selectedTicket.nema_ref || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">WEEE Ref</span><span className="font-mono text-xs">{selectedTicket.weee_ref || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Basel Permit</span><span className="font-mono text-xs">{selectedTicket.basel_permit || "—"}</span></div>
              </div>

              <div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Hazardous Materials</div>
                <div className="flex flex-wrap gap-1">
                  {selectedTicket.hazardous_materials?.map(m => <Badge key={m} label={m} color="#EF4444" />)}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Status</div>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => {
                    updateTicketStatus(selectedTicket.id, e.target.value as TicketStatus);
                    setSelectedTicket(null);
                  }}
                  disabled={updating === `ticket_${selectedTicket.id}`}
                  className="text-sm border rounded-lg px-3 py-1.5"
                >
                  {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500">
                <div><div className="text-gray-400">Submitted</div><div>{new Date(selectedTicket.created_at).toLocaleDateString()}</div></div>
                <div><div className="text-gray-400">Collected</div><div>{selectedTicket.collected_at ? new Date(selectedTicket.collected_at).toLocaleDateString() : "—"}</div></div>
                <div><div className="text-gray-400">Certified</div><div>{selectedTicket.certified_at ? new Date(selectedTicket.certified_at).toLocaleDateString() : "—"}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── User Detail Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-black text-lg">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold">{selectedUser.name}</div>
                  <div className="text-xs text-gray-400">{selectedUser.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-emerald-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-emerald-700">{selectedUser.total_tickets}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Tickets</div>
                </div>
                <div className="text-center bg-amber-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-amber-600">{fmt(selectedUser.total_points)}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Points</div>
                </div>
                <div className="text-center bg-blue-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-blue-700">{selectedUser.total_co2_saved}</div>
                  <div className="text-[9px] text-gray-400 uppercase">CO₂ kg</div>
                </div>
              </div>
              <div className="space-y-2 text-xs border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between"><span className="text-gray-400">Status</span><Badge label={selectedUser.status.toUpperCase()} color={selectedUser.status === "active" ? "#059669" : "#9CA3AF"} /></div>
                <div className="flex justify-between"><span className="text-gray-400">Joined</span><span>{new Date(selectedUser.joined_at).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Last Activity</span><span>{new Date(selectedUser.last_activity).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Center Detail Modal ── */}
      {selectedCenter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <div className="font-bold">{selectedCenter.name}</div>
                <div className="text-xs text-gray-400">📍 {selectedCenter.location}</div>
              </div>
              <button onClick={() => setSelectedCenter(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-emerald-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-emerald-700">{selectedCenter.total_collected}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Devices</div>
                </div>
                <div className="text-center bg-blue-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-blue-700">{selectedCenter.total_weight_kg}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Weight kg</div>
                </div>
                <div className="text-center bg-purple-50 rounded-xl p-3">
                  <div className="text-2xl font-black text-purple-700">{selectedCenter.certifications.length}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Certs</div>
                </div>
              </div>
              <p className="text-gray-600 text-xs">{selectedCenter.description}</p>
              <div className="space-y-1 text-xs border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between"><span className="text-gray-400">📞 Phone</span><span>{selectedCenter.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">✉️ Email</span><span className="truncate ml-4">{selectedCenter.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">🕒 Hours</span><span>{selectedCenter.operating_hours}</span></div>
                {selectedCenter.price_range && <div className="flex justify-between"><span className="text-gray-400">💰 Pricing</span><span>{selectedCenter.price_range}</span></div>}
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Certifications</div>
                <div className="flex flex-wrap gap-1">
                  {selectedCenter.certifications.map(c => <Badge key={c} label={c} color="#059669" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}