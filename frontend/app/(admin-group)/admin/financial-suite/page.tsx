"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

/* ─────────────── Types (matching backend schemas) ─────────────── */
interface AdminStats {
  totalCards: number;
  activeCards: number;
  frozenCards: number;
  pendingApplications: number;
  approvedToday: number;
  rejectedToday: number;
  totalSpendVolume: number;
  totalLoadedBalance: number;
  fraudFlags: number;
  expiringSoon: number;
  totalHolders: number;
  newHoldersThisMonth: number;
}

interface CardHolder {
  id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  email: string;
  employment: string;
  kycStatus: "verified" | "pending" | "failed" | "expired";
  createdAt: string;
  cards: number;
}

const getInitials = (name?: string, fallback?: string) => {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .join("");
  if (initials) return initials.toUpperCase();
  return fallback?.[0]?.toUpperCase() ?? "?";
};

interface CardRecord {
  id: string;
  holderName: string;
  holderEmail: string;
  cardType: "e_nextbit" | "visa_cyber" | "visa_black";
  cardNumber: string;
  lastFour: string;
  status: "active" | "frozen" | "expired" | "cancelled" | "pending_activation";
  balance: number;
  totalSpent: number;
  issuedAt: string;
  expiresAt: string;
  fraudFlag: boolean;
  country: string;
}

interface Application {
  id: string;
  holderName: string;
  holderEmail: string;
  phone: string;
  cardType: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  employment: string;
  idNumber: string;
  riskScore: number;
}

interface Transaction {
  id: string;
  cardLastFour: string;
  holderName: string;
  merchant: string;
  amount: number;
  type: "purchase" | "deposit" | "withdrawal" | "refund" | "fee";
  status: "completed" | "pending" | "failed" | "flagged";
  createdAt: string;
  country: string;
  category: string;
}

type Tab = "overview" | "cards" | "applications" | "holders" | "transactions" | "fraud";

// Card type labels for display
const CARD_TYPE_LABELS: Record<string, string> = {
  e_nextbit: "E-NextBit",
  visa_cyber: "Visa Cyber",
  visa_black: "Visa Black",
};

/* ─────────────── API Service ─────────────── */
const API_BASE = "/api/admin/cards";

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

/* ─────────────── Status Badge Component ─────────────── */
function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    verified: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    frozen: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    pending_activation: "bg-yellow-100 text-yellow-800",
    under_review: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
    flagged: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-600",
    cancelled: "bg-gray-100 text-gray-600",
    purchase: "bg-purple-100 text-purple-800",
    deposit: "bg-green-100 text-green-800",
    withdrawal: "bg-orange-100 text-orange-800",
    refund: "bg-cyan-100 text-cyan-800",
    fee: "bg-gray-100 text-gray-600",
    e_nextbit: "bg-emerald-100 text-emerald-800",
    visa_cyber: "bg-cyan-100 text-cyan-800",
    visa_black: "bg-purple-100 text-purple-800",
  };
  const key = status ?? "unknown";
  const cls = map[key] ?? "bg-gray-100 text-gray-600";
  const label = key.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

/* ─────────────── Stat Card Component ─────────────── */
function StatCard({
  label, value, sub, color = "blue", icon,
}: {
  label: string; value: string | number; sub?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "cyan" | "orange";
  icon: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    red:    "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    cyan:   "bg-cyan-50 text-cyan-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ─────────────── Icons (inline SVG) ─────────────── */
const Icon = {
  Card: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="1.7"/><path d="M2 10h20" strokeWidth="1.7"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.7"/></svg>,
  Activity: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.7"/></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.7"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="1.7"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.7"/></svg>,
  Dollar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" strokeWidth="1.7"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="1.7"/></svg>,
  Zap: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth="1.7"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.7"/><polyline points="12 6 12 12 16 14" strokeWidth="1.7"/></svg>,
  Flag: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.7"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="1.7"/></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" strokeWidth="1.7"/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="1.7"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="1.7"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.7"/></svg>,
  Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.7"/><polyline points="7 10 12 15 17 10" strokeWidth="1.7"/><line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.7"/></svg>,
  Warning: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="1.7"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="1.7"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="1.7"/></svg>,
};

/* ─────────────── Table components ─────────────── */
function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 first:rounded-tl-2xl last:rounded-tr-2xl whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 whitespace-nowrap text-gray-700 ${className}`}>{children}</td>;
}

function ActionBtn({
  onClick, color = "gray", children, disabled = false,
}: {
  onClick: () => void; color?: "green" | "red" | "blue" | "gray"; children: React.ReactNode; disabled?: boolean;
}) {
  const map = {
    green: "bg-green-50 text-green-700 hover:bg-green-100",
    red:   "bg-red-50 text-red-700 hover:bg-red-100",
    blue:  "bg-blue-50 text-blue-700 hover:bg-blue-100",
    gray:  "bg-gray-50 text-gray-700 hover:bg-gray-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${map[color]} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════
   MAIN ADMIN COMPONENT
═══════════════════════════════════════════ */
export default function CardsAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, cardsData, appsData, holdersData, txData] = await Promise.all([
        apiFetch<AdminStats>(`${API_BASE}/stats`),
        apiFetch<CardRecord[]>(API_BASE),
        apiFetch<Application[]>(`${API_BASE}/applications`),
        apiFetch<CardHolder[]>(`${API_BASE}/holders`),
        apiFetch<Transaction[]>(`${API_BASE}/transactions`),
      ]);
      setStats(statsData);
      setCards(cardsData);
      setApplications(appsData);
      setHolders(holdersData);
      setTransactions(txData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Card actions
  const toggleFreeze = async (cardId: string, currentStatus: string) => {
    const newStatus = currentStatus === "frozen" ? "active" : "frozen";
    setActionLoading(`freeze_${cardId}`);
    try {
      await apiFetch(`${API_BASE}/${cardId}/status?status=${newStatus}`, { method: "PATCH" });
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: newStatus as CardRecord["status"] } : c));
      toast.success(`Card ${newStatus === "active" ? "activated" : "frozen"} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update card status");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to cancel this card?")) return;
    setActionLoading(`cancel_${cardId}`);
    try {
      await apiFetch(`${API_BASE}/${cardId}/status?status=cancelled`, { method: "PATCH" });
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: "cancelled" } : c));
      toast.success("Card cancelled successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel card");
    } finally {
      setActionLoading(null);
    }
  };

  // Application actions
  const reviewApplication = async (appId: string, action: "approved" | "rejected") => {
    setActionLoading(`app_${appId}`);
    try {
      await apiFetch(`${API_BASE}/applications/${appId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: action, reviewedAt: new Date().toISOString() } : a));
      toast.success(`Application ${action}`);
      fetchAllData(); // Refresh stats
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} application`);
    } finally {
      setActionLoading(null);
    }
  };

  // KYC actions
  const updateKyc = async (holderId: string, kycStatus: CardHolder["kycStatus"]) => {
    setActionLoading(`kyc_${holderId}`);
    try {
      await apiFetch(`${API_BASE}/holders/${holderId}/kyc`, {
        method: "PATCH",
        body: JSON.stringify({ status: kycStatus }),
      });
      setHolders(prev => prev.map(h => h.id === holderId ? { ...h, kycStatus } : h));
      toast.success(`KYC status updated to ${kycStatus}`);
      fetchAllData(); // Refresh stats
    } catch (err: any) {
      toast.error(err.message || "Failed to update KYC status");
    } finally {
      setActionLoading(null);
    }
  };

  // Clear transaction flag
  const clearTransactionFlag = async (txId: string) => {
    setActionLoading(`tx_${txId}`);
    try {
      await apiFetch(`${API_BASE}/transactions/${txId}/clear-flag`, { method: "POST" });
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: "completed" } : t));
      toast.success("Transaction flag cleared");
      fetchAllData(); // Refresh stats
    } catch (err: any) {
      toast.error(err.message || "Failed to clear flag");
    } finally {
      setActionLoading(null);
    }
  };

  // Filters
  const filteredCards = cards.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.holderName.toLowerCase().includes(q) || c.lastFour.includes(q) || c.holderEmail.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredApps = applications.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.holderName.toLowerCase().includes(q) || a.holderEmail.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredHolders = holders.filter(h => {
    const q = search.toLowerCase();
    return !q || h.fullName.toLowerCase().includes(q) || h.email.toLowerCase().includes(q) || h.idNumber.includes(q);
  });

  const filteredTx = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.holderName.toLowerCase().includes(q) || t.merchant.toLowerCase().includes(q) || t.cardLastFour.includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fraudItemsCount = cards.filter(c => c.fraudFlag).length + transactions.filter(t => t.status === "flagged").length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Icon.Activity /> },
    { id: "cards", label: "Cards", icon: <Icon.Card />, count: cards.length },
    { id: "applications", label: "Applications", icon: <Icon.Clock />, count: applications.filter(a => a.status === "pending").length },
    { id: "holders", label: "Holders", icon: <Icon.Users />, count: holders.length },
    { id: "transactions", label: "Transactions", icon: <Icon.Dollar />, count: transactions.length },
    { id: "fraud", label: "Fraud & Flags", icon: <Icon.Flag />, count: fraudItemsCount },
  ];

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 tracking-wide">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Icon.Card />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm tracking-tight">NextBit Admin</span>
              <span className="ml-2 text-xs text-gray-400">Cards & Payments</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              className="text-xs bg-gray-100 text-gray-700 font-semibold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
            {stats && (
              <>
                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
                  {stats.fraudFlags} fraud flags
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">
                  {stats.pendingApplications} pending
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* ── Tab nav ── */}
        <nav className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSearch(""); setStatusFilter("all"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === t.id ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ══════════ OVERVIEW ══════════ */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard label="Total Cards" value={stats.totalCards} color="blue" icon={<Icon.Card />} />
              <StatCard label="Active" value={stats.activeCards} sub={`${Math.round(stats.activeCards / stats.totalCards * 100)}% of total`} color="green" icon={<Icon.Check />} />
              <StatCard label="Frozen" value={stats.frozenCards} color="cyan" icon={<Icon.Lock />} />
              <StatCard label="Pending Apps" value={stats.pendingApplications} color="yellow" icon={<Icon.Clock />} />
              <StatCard label="Fraud Flags" value={stats.fraudFlags} color="red" icon={<Icon.Flag />} />
              <StatCard label="Expiring Soon" value={stats.expiringSoon} color="orange" icon={<Icon.Warning />} />
              <StatCard label="Total Holders" value={stats.totalHolders} color="purple" icon={<Icon.Users />} />
              <StatCard label="New (Month)" value={stats.newHoldersThisMonth} color="blue" icon={<Icon.Zap />} />
              <StatCard label="Approved (All)" value={stats.approvedToday} color="green" icon={<Icon.Check />} />
              <StatCard label="Rejected (All)" value={stats.rejectedToday} color="red" icon={<Icon.X />} />
              <StatCard label="Loaded Balance" value={`KES ${(stats.totalLoadedBalance / 1000000).toFixed(1)}M`} color="blue" icon={<Icon.Dollar />} />
              <StatCard label="Total Volume" value={`KES ${(stats.totalSpendVolume / 1000000).toFixed(1)}M`} color="green" icon={<Icon.Activity />} />
            </div>

            {/* Card type breakdown */}
            <div className="grid md:grid-cols-3 gap-4">
              {(["e_nextbit", "visa_cyber", "visa_black"] as const).map(ct => {
                const subset = cards.filter(c => c.cardType === ct);
                const active = subset.filter(c => c.status === "active").length;
                const vol = subset.reduce((s, c) => s + c.totalSpent, 0);
                const colors: Record<string, string> = { e_nextbit: "from-emerald-500 to-green-600", visa_cyber: "from-cyan-500 to-blue-600", visa_black: "from-purple-600 to-gray-900" };
                return (
                  <div key={ct} className={`bg-gradient-to-br ${colors[ct]} rounded-2xl p-5 text-white`}>
                    <div className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">{CARD_TYPE_LABELS[ct]}</div>
                    <div className="text-3xl font-bold mb-3">{subset.length} <span className="text-base font-normal opacity-70">cards</span></div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/15 rounded-xl px-3 py-2">
                        <div className="opacity-70 text-xs">Active</div>
                        <div className="font-bold">{active}</div>
                      </div>
                      <div className="bg-white/15 rounded-xl px-3 py-2">
                        <div className="opacity-70 text-xs">Volume</div>
                        <div className="font-bold">KES {(vol / 1000).toFixed(0)}K</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent transactions + pending applications */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Icon.Activity /><span>Recent Transactions</span>
                </h3>
                <div className="space-y-2">
                  {transactions.slice(0, 6).map(tx => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{tx.merchant}</div>
                        <div className="text-xs text-gray-400">{tx.holderName} · ••{tx.cardLastFour}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-gray-800"}`}>
                          {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)} KES
                        </div>
                        <Badge status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Icon.Clock /><span>Pending Applications</span>
                </h3>
                <div className="space-y-2">
                  {applications.filter(a => a.status === "pending").slice(0, 6).map(app => (
                    <div key={app.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{app.holderName}</div>
                        <div className="text-xs text-gray-400">{app.cardType}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <ActionBtn
                          color="green"
                          onClick={() => reviewApplication(app.id, "approved")}
                          disabled={actionLoading === `app_${app.id}`}
                        >
                          Approve
                        </ActionBtn>
                        <ActionBtn
                          color="red"
                          onClick={() => reviewApplication(app.id, "rejected")}
                          disabled={actionLoading === `app_${app.id}`}
                        >
                          Reject
                        </ActionBtn>
                      </div>
                    </div>
                  ))}
                  {applications.filter(a => a.status === "pending").length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No pending applications</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ CARDS ══════════ */}
        {activeTab === "cards" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                  <input
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-64"
                    placeholder="Search name, email, last 4…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="frozen">Frozen</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending_activation">Pending activation</option>
                </select>
              </div>
              <span className="text-xs text-gray-400">{filteredCards.length} results</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Card Holder</Th>
                    <Th>Card Number</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Balance</Th>
                    <Th>Total Spent</Th>
                    <Th>Issued</Th>
                    <Th>Expires</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCards.map(c => (
                    <tr key={c.id} className={`hover:bg-gray-50/50 ${c.fraudFlag ? "bg-red-50/40" : ""}`}>
                      <Td>
                        <div className="font-semibold text-gray-900 text-sm">{c.holderName}</div>
                        <div className="text-xs text-gray-400">{c.holderEmail}</div>
                        {c.fraudFlag && <span className="text-xs text-red-600 font-semibold">⚠ Fraud flag</span>}
                      </Td>
                      <Td><span className="font-mono text-xs">{c.cardNumber}</span></Td>
                      <Td><Badge status={c.cardType} /></Td>
                      <Td><Badge status={c.status} /></Td>
                      <Td className="font-semibold">KES {formatCurrency(c.balance)}</Td>
                      <Td className="text-gray-500">KES {formatCurrency(c.totalSpent)}</Td>
                      <Td className="text-gray-400 text-xs">{new Date(c.issuedAt).toLocaleDateString()}</Td>
                      <Td className="text-gray-400 text-xs">{new Date(c.expiresAt).toLocaleDateString()}</Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <ActionBtn
                            color={c.status === "frozen" ? "green" : "blue"}
                            onClick={() => toggleFreeze(c.id, c.status)}
                            disabled={actionLoading === `freeze_${c.id}`}
                          >
                            {c.status === "frozen" ? "Unfreeze" : "Freeze"}
                          </ActionBtn>
                          <ActionBtn
                            color="red"
                            onClick={() => cancelCard(c.id)}
                            disabled={actionLoading === `cancel_${c.id}`}
                          >
                            Cancel
                          </ActionBtn>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          </div>
        )}

        {/* ══════════ APPLICATIONS ══════════ */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                  <input
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-64"
                    placeholder="Search applicant…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <span className="text-xs text-gray-400">{filteredApps.length} results</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Applicant</Th>
                    <Th>Card</Th>
                    <Th>ID Number</Th>
                    <Th>Employment</Th>
                    <Th>Risk Score</Th>
                    <Th>Status</Th>
                    <Th>Applied</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredApps.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <Td>
                        <div className="font-semibold text-gray-900 text-sm">{a.holderName}</div>
                        <div className="text-xs text-gray-400">{a.holderEmail}</div>
                        <div className="text-xs text-gray-400">{a.phone}</div>
                      </Td>
                      <Td><span className="text-sm font-medium">{a.cardType}</span></Td>
                      <Td><span className="font-mono text-xs">{a.idNumber}</span></Td>
                      <Td className="capitalize">{a.employment}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${a.riskScore > 70 ? "bg-red-500" : a.riskScore > 40 ? "bg-yellow-400" : "bg-green-500"}`}
                              style={{ width: `${a.riskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{a.riskScore}</span>
                        </div>
                      </Td>
                      <Td><Badge status={a.status} /></Td>
                      <Td className="text-xs text-gray-400">{new Date(a.appliedAt).toLocaleDateString()}</Td>
                      <Td>
                        {(a.status === "pending" || a.status === "under_review") && (
                          <div className="flex gap-1.5">
                            <ActionBtn
                              color="green"
                              onClick={() => reviewApplication(a.id, "approved")}
                              disabled={actionLoading === `app_${a.id}`}
                            >
                              Approve
                            </ActionBtn>
                            <ActionBtn
                              color="red"
                              onClick={() => reviewApplication(a.id, "rejected")}
                              disabled={actionLoading === `app_${a.id}`}
                            >
                              Reject
                            </ActionBtn>
                          </div>
                        )}
                        {a.rejectionReason && (
                          <span className="text-xs text-red-500">{a.rejectionReason}</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          </div>
        )}

        {/* ══════════ HOLDERS ══════════ */}
        {activeTab === "holders" && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center justify-between">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                <input
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-64"
                  placeholder="Search name, email, ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-gray-400">{filteredHolders.length} results</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Holder</Th>
                    <Th>ID Number</Th>
                    <Th>Phone</Th>
                    <Th>Employment</Th>
                    <Th>KYC Status</Th>
                    <Th>Cards</Th>
                    <Th>Joined</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredHolders.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {getInitials(h.fullName, h.email)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{h.fullName}</div>
                            <div className="text-xs text-gray-400">{h.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td><span className="font-mono text-xs">{h.idNumber}</span></Td>
                      <Td className="text-xs">{h.phone}</Td>
                      <Td className="capitalize text-sm">{h.employment}</Td>
                      <Td><Badge status={h.kycStatus} /></Td>
                      <Td><span className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">{h.cards}</span></Td>
                      <Td className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        <div className="flex gap-1.5">
                          {h.kycStatus !== "verified" && (
                            <ActionBtn
                              color="green"
                              onClick={() => updateKyc(h.id, "verified")}
                              disabled={actionLoading === `kyc_${h.id}`}
                            >
                              Verify KYC
                            </ActionBtn>
                          )}
                          {h.kycStatus === "verified" && (
                            <ActionBtn
                              color="red"
                              onClick={() => updateKyc(h.id, "failed")}
                              disabled={actionLoading === `kyc_${h.id}`}
                            >
                              Revoke KYC
                            </ActionBtn>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          </div>
        )}

        {/* ══════════ TRANSACTIONS ══════════ */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon.Search /></span>
                  <input
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white w-64"
                    placeholder="Search holder, merchant…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Card</Th>
                    <Th>Holder</Th>
                    <Th>Merchant</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>Category</Th>
                    <Th>Country</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTx.map(tx => (
                    <tr key={tx.id} className={`hover:bg-gray-50/50 ${tx.status === "flagged" ? "bg-red-50/30" : ""}`}>
                      <Td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">••{tx.cardLastFour}</span></Td>
                      <Td className="text-sm font-medium">{tx.holderName}</Td>
                      <Td className="text-sm">{tx.merchant}</Td>
                      <Td><Badge status={tx.type} /></Td>
                      <Td>
                        <span className={`font-bold text-sm ${tx.amount > 0 ? "text-green-600" : "text-gray-800"}`}>
                          {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)} KES
                        </span>
                      </Td>
                      <Td className="text-xs text-gray-500">{tx.category}</Td>
                      <Td className="text-xs">{tx.country}</Td>
                      <Td><Badge status={tx.status} /></Td>
                      <Td className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        {tx.status === "flagged" && (
                          <ActionBtn
                            color="green"
                            onClick={() => clearTransactionFlag(tx.id)}
                            disabled={actionLoading === `tx_${tx.id}`}
                          >
                            Clear flag
                          </ActionBtn>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          </div>
        )}

        {/* ══════════ FRAUD & FLAGS ══════════ */}
        {activeTab === "fraud" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Flagged Cards" value={cards.filter(c => c.fraudFlag).length} color="red" icon={<Icon.Flag />} />
              <StatCard label="Flagged Transactions" value={transactions.filter(t => t.status === "flagged").length} color="red" icon={<Icon.Warning />} />
              <StatCard label="Frozen (Risk)" value={stats?.frozenCards || 0} color="yellow" icon={<Icon.Lock />} />
              <StatCard label="Failed Transactions" value={transactions.filter(t => t.status === "failed").length} color="orange" icon={<Icon.X />} />
            </div>

            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                <Icon.Flag /><span>Flagged Cards</span>
              </h3>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Holder</Th>
                    <Th>Card Number</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Balance</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {cards.filter(c => c.fraudFlag).map(c => (
                    <tr key={c.id} className="bg-red-50/20 hover:bg-red-50/40">
                      <Td>
                        <div className="font-semibold text-gray-900 text-sm">{c.holderName}</div>
                        <div className="text-xs text-gray-400">{c.holderEmail}</div>
                      </Td>
                      <Td><span className="font-mono text-xs">{c.cardNumber}</span></Td>
                      <Td><Badge status={c.cardType} /></Td>
                      <Td><Badge status={c.status} /></Td>
                      <Td className="font-semibold">KES {formatCurrency(c.balance)}</Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <ActionBtn
                            color="blue"
                            onClick={() => toggleFreeze(c.id, c.status)}
                            disabled={actionLoading === `freeze_${c.id}`}
                          >
                            {c.status === "frozen" ? "Unfreeze" : "Freeze"}
                          </ActionBtn>
                          <ActionBtn
                            color="red"
                            onClick={() => cancelCard(c.id)}
                            disabled={actionLoading === `cancel_${c.id}`}
                          >
                            Cancel
                          </ActionBtn>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>

            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                <Icon.Warning /><span>Flagged Transactions</span>
              </h3>
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>Card</Th>
                    <Th>Holder</Th>
                    <Th>Merchant</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {transactions.filter(t => t.status === "flagged").map(tx => (
                    <tr key={tx.id} className="bg-red-50/20 hover:bg-red-50/40">
                      <Td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">••{tx.cardLastFour}</span></Td>
                      <Td className="font-semibold text-sm">{tx.holderName}</Td>
                      <Td className="text-sm">{tx.merchant}</Td>
                      <Td className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-700"}`}>
                        {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)} KES
                      </Td>
                      <Td><Badge status={tx.status} /></Td>
                      <Td>
                        <ActionBtn
                          color="green"
                          onClick={() => clearTransactionFlag(tx.id)}
                          disabled={actionLoading === `tx_${tx.id}`}
                        >
                          Clear flag
                        </ActionBtn>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}