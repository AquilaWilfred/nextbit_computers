"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Link from "next/link";
import {
  Globe2, Store, ArrowRightLeft, Package, TrendingUp,
  ShieldCheck, AlertTriangle, Loader2, ChevronRight,
  Zap, Lock, Building2, BarChart3, Network, Star,
  CheckCircle2, Clock, XCircle, Users2, Wallet,
  PackageSearch, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkSummary {
  totalStores: number;
  activeInNetwork: number;
  pendingRequests: number;
  interStoreTransfers: number;
  totalNetworkStock: number;
  conflictFlags: number;
  networkRevenue: number;
  networkUptime: string;
}

interface NetworkStore {
  id: string;
  name: string;
  address: string;
  status: "active" | "pending" | "suspended";
  inventoryShared: boolean;
  joinedAt: string;
  totalOrders: number;
  rating: number;
}

interface InterStoreTransfer {
  id: string;
  fromStore: string;
  toStore: string;
  product: string;
  quantity: number;
  status: "completed" | "pending" | "conflict" | "cancelled";
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

const STORE_STATUS: Record<
  NetworkStore["status"],
  { label: string; color: string; icon: React.ElementType }
> = {
  active:    { label: "Active",    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "bg-amber-500/10 text-amber-600 border-amber-500/20",       icon: Clock },
  suspended: { label: "Suspended", color: "bg-red-500/10 text-red-600 border-red-500/20",             icon: XCircle },
};

const TRANSFER_STATUS: Record<
  InterStoreTransfer["status"],
  { label: string; color: string; icon: React.ElementType }
> = {
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "bg-amber-500/10 text-amber-600 border-amber-500/20",       icon: Clock },
  conflict:  { label: "Conflict",  color: "bg-red-500/10 text-red-600 border-red-500/20",             icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground border-border",             icon: XCircle },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useNetworkData() {
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>([]);
  const [stores, setStores] = useState<NetworkStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [s, t, st] = await Promise.all([
        fetch("/api/admin/network").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/network/transfers?limit=20").then((r) => r.json()).catch(() => []),
        fetch("/api/admin/network/stores").then((r) => r.json()).catch(() => []),
      ]);
      setSummary(
        s ?? {
          totalStores: 0, activeInNetwork: 0, pendingRequests: 0,
          interStoreTransfers: 0, totalNetworkStock: 0, conflictFlags: 0,
          networkRevenue: 0, networkUptime: "—",
        }
      );
      setTransfers(Array.isArray(t) ? t : []);
      setStores(Array.isArray(st) ? st : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { summary, transfers, stores, loading, refreshing, refetch: () => fetch_(true) };
}

// ─── Network Health ───────────────────────────────────────────────────────────

function NetworkHealthPanel({ summary }: { summary: NetworkSummary | null }) {
  const checks = [
    { label: "Stock Sync",                ok: true },
    { label: "Inter-store Routing",       ok: true },
    { label: "Conflict Resolution",       ok: (summary?.conflictFlags ?? 0) === 0 },
    { label: "Federation Toggle Active",  ok: (summary?.activeInNetwork ?? 0) > 0 },
  ];
  return (
    <Card className="border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[var(--brand)]" />
        <h3 className="font-semibold text-sm">Network Health</h3>
        {summary?.networkUptime && (
          <span className="ml-auto text-xs text-muted-foreground">{summary.networkUptime} uptime</span>
        )}
      </div>
      <div className="space-y-3">
        {checks.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            {item.ok ? (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Issue
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({
  summary,
  transfers,
  loading,
  onTabChange,
}: {
  summary: NetworkSummary | null;
  transfers: InterStoreTransfer[];
  loading: boolean;
  onTabChange: (tab: string) => void;
}) {
  const statCards = summary
    ? [
        {
          label: "Stores in Network",
          value: summary.activeInNetwork,
          sub: `of ${summary.totalStores} total`,
          icon: Store,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Inter-Store Transfers",
          value: summary.interStoreTransfers,
          sub: "this month",
          icon: ArrowRightLeft,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        {
          label: "Network Stock Units",
          value: summary.totalNetworkStock.toLocaleString(),
          sub: "across all branches",
          icon: PackageSearch,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: "Network Revenue",
          value: formatKES(summary.networkRevenue),
          sub: "this month",
          icon: TrendingUp,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: "Pending Requests",
          value: summary.pendingRequests,
          sub: "need approval",
          icon: Clock,
          color: summary.pendingRequests > 0 ? "text-amber-500" : "text-muted-foreground",
          bg: summary.pendingRequests > 0 ? "bg-amber-500/10" : "bg-muted",
        },
        {
          label: "Conflict Flags",
          value: summary.conflictFlags,
          sub: "need resolution",
          icon: AlertTriangle,
          color: summary.conflictFlags > 0 ? "text-red-500" : "text-muted-foreground",
          bg: summary.conflictFlags > 0 ? "bg-red-500/10" : "bg-muted",
        },
      ]
    : [];

  const recentTransfers = transfers.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))
          : statCards.map((s) => (
              <Card key={s.label} className="p-5 border border-border">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-sm font-medium mt-0.5">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </Card>
            ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent transfers */}
        <div className="lg:col-span-2">
          <Card className="border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Recent Inter-Store Transfers</h2>
              </div>
              <button
                onClick={() => onTabChange("orders")}
                className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="px-5 py-3 flex gap-3 items-center">
                    <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-muted rounded animate-pulse ml-auto" />
                  </div>
                ))
              ) : recentTransfers.length === 0 ? (
                <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                  No inter-store transfers yet.
                </div>
              ) : (
                recentTransfers.map((t) => {
                  const s = TRANSFER_STATUS[t.status];
                  const Icon = s.icon;
                  return (
                    <div key={t.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.product} × {t.quantity}</p>
                        <p className="text-xs text-muted-foreground">{t.fromStore} → {t.toStore}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {new Date(t.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 ${s.color}`}>
                          <Icon className="w-3 h-3" /> {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pending join requests alert */}
          {summary && summary.pendingRequests > 0 && (
            <Card className="border border-amber-500/40 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-sm">Pending Join Requests</p>
              </div>
              <p className="text-2xl font-bold">{summary.pendingRequests}</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Stores waiting to join your network
              </p>
              <button
                onClick={() => onTabChange("stores")}
                className="w-full text-xs border border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors font-medium"
              >
                Review Requests
              </button>
            </Card>
          )}

          {/* Conflict flags alert */}
          {summary && summary.conflictFlags > 0 && (
            <Card className="border border-red-500/40 bg-red-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="font-semibold text-sm">Active Conflict Flags</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.conflictFlags}</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Inventory or order conflicts requiring resolution
              </p>
              <button
                onClick={() => onTabChange("orders")}
                className="w-full text-xs border border-red-500/30 text-red-600 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors font-medium"
              >
                Resolve Conflicts
              </button>
            </Card>
          )}

          <NetworkHealthPanel summary={summary} />

          {/* How it works */}
          <Card className="border border-border p-5 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--brand)]" />
              <p className="font-semibold text-sm">How It Works</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each store admin can toggle federation on/off for their branch. When active, their
              stock is visible across the network and they can send/receive inter-store transfers
              at zero extra charge.
            </p>
          </Card>

          {/* Quick actions */}
          <Card className="border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Inventory Visibility", desc: "Real-time stock across all stores", icon: PackageSearch, tab: "stores" },
                { label: "Network Analytics",    desc: "Combined revenue & performance",    icon: BarChart3,     tab: "net-analytics" },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => onTabChange(a.tab)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-[var(--brand)]/40 hover:bg-accent transition-all text-left group"
                >
                  <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-[var(--brand)] transition-colors shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{a.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Stores ──────────────────────────────────────────────────────────────

function StoresTab({
  stores,
  loading,
  onRefetch,
}: {
  stores: NetworkStore[];
  loading: boolean;
  onRefetch: () => void;
}) {
  const handleApprove = async (store: NetworkStore) => {
    toast.promise(
      fetch(`/api/admin/network/stores/${store.id}/approve`, { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error();
        onRefetch();
      }),
      { loading: "Approving…", success: `${store.name} approved`, error: "Failed to approve" }
    );
  };

  const handleReject = async (store: NetworkStore) => {
    toast.promise(
      fetch(`/api/admin/network/stores/${store.id}/reject`, { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error();
        onRefetch();
      }),
      { loading: "Rejecting…", success: `${store.name} rejected`, error: "Failed to reject" }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${stores.length} stores in network`}
        </p>
        <Link href="/admin/network/stores/invite">
          <Button size="sm" className="gap-1.5">
            <Store className="w-4 h-4" /> Invite Store
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border border-border">
          <Network className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-semibold text-sm">No stores in network</p>
          <p className="text-xs text-muted-foreground mt-1">Invite your first store to get started.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {stores.map((store) => {
            const cfg = STORE_STATUS[store.status];
            const Icon = cfg.icon;
            return (
              <Card key={store.id} className="p-5 hover:border-[var(--brand)]/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold">{store.name}</h3>
                      {store.status === "active" && store.inventoryShared && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          <Network className="w-3 h-3 mr-1" /> Sharing
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{store.address}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${cfg.color}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center py-3 border-y border-border my-3">
                  <div>
                    <p className="text-lg font-bold tabular-nums">{store.totalOrders}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{store.rating > 0 ? store.rating : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{store.inventoryShared ? "On" : "Off"}</p>
                    <p className="text-[10px] text-muted-foreground">Sharing</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Joined {new Date(store.joinedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="flex gap-2">
                  {store.status === "pending" ? (
                    <>
                      <Button size="sm" className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => handleApprove(store)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => handleReject(store)}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href={`/admin/network/stores/${store.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">View Details</Button>
                      </Link>
                      <Link href={`/admin/network/stores/${store.id}/orders`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">Orders</Button>
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Orders / Transfers ──────────────────────────────────────────────────

function OrdersTab({
  transfers,
  loading,
}: {
  transfers: InterStoreTransfer[];
  loading: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<InterStoreTransfer["status"] | "all">("all");

  const filtered = statusFilter === "all"
    ? transfers
    : transfers.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "completed", "pending", "conflict", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {s === "all" ? "All" : TRANSFER_STATUS[s].label}
          </button>
        ))}
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Product", "From", "To", "Qty", "Date", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No transfers found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const s = TRANSFER_STATUS[t.status];
                  const Icon = s.icon;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{t.product}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.fromStore}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.toStore}</td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums">{t.quantity}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${s.color}`}>
                          <Icon className="w-3 h-3" /> {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({
  networkEnabled,
  inventoryShare,
  onToggleNetwork,
  onToggleInventory,
}: {
  networkEnabled: boolean;
  inventoryShare: boolean;
  onToggleNetwork: (val: boolean) => Promise<void>;
  onToggleInventory: (val: boolean) => void;
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-5 space-y-5">
        <h2 className="font-semibold">Network Settings</h2>
        {[
          {
            label: "Federated Network",
            desc: "Allow this store to participate in the retail network",
            value: networkEnabled,
            onChange: onToggleNetwork,
          },
          {
            label: "Inventory Sharing",
            desc: "Share your inventory visibility with other network stores",
            value: inventoryShare,
            onChange: (v: boolean) => { onToggleInventory(v); return Promise.resolve(); },
          },
        ].map((setting, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="font-medium text-sm">{setting.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{setting.desc}</p>
            </div>
            <Switch checked={setting.value} onCheckedChange={setting.onChange} />
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Permissions &amp; Escalation</h2>
        <p className="text-xs text-muted-foreground mb-4">Store Admin limitations within the network</p>
        <div className="space-y-3">
          {[
            { allowed: true,  text: "View own store inventory and sales" },
            { allowed: true,  text: "Place inter-store stock requests" },
            { allowed: true,  text: "Accept or reject incoming stock requests" },
            { allowed: false, text: "View other stores' financial data" },
            { allowed: false, text: "Override conflict flags (must escalate to NextBit Manager)" },
            { allowed: false, text: "Modify hardware hashes or wipe audit logs" },
            { allowed: false, text: "Assign NextBit Global roles" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {p.allowed
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={p.allowed ? "" : "text-muted-foreground"}>{p.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Conflict Escalation</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Any inventory conflicts, disputed inter-store orders, or permission violations must be
              escalated to a <strong>NextBit Manager</strong>. Store Admins cannot override these
              flags independently.
            </p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5">
              <Users2 className="w-3.5 h-3.5" /> Contact NextBit Manager
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminNetworkPage() {
  const { summary, transfers, stores, loading, refreshing, refetch } = useNetworkData();
  const [networkEnabled, setNetworkEnabled] = useState(true);
  const [inventoryShare, setInventoryShare] = useState(true);
  const [togglingNetwork, setTogglingNetwork] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "stores" | "orders" | "settings">("overview");
  const router = useRouter();

  const handleToggleNetwork = async (val: boolean) => {
    setTogglingNetwork(true);
    try {
      const res = await fetch("/api/admin/network/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: val }),
      });
      if (!res.ok) throw new Error();
      setNetworkEnabled(val);
      toast.success(val ? "Federated Network enabled" : "Federated Network disabled");
    } catch {
      toast.error("Failed to update network status");
    } finally {
      setTogglingNetwork(false);
    }
  };

  const TABS = [
    { key: "overview",  label: "Overview" },
    { key: "stores",    label: "Stores" },
    { key: "orders",    label: "Transfers" },
    { key: "settings",  label: "Settings" },
  ] as const;

  return (
    <div>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-5 h-5 text-[var(--brand)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Federated Retail Network
              </span>
              <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20 text-[10px] font-bold uppercase tracking-wider">
                <Zap className="w-3 h-3 mr-1" /> Beta
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Network Overview</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Real-time inventory sharing and inter-store ordering across your verified retail network
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={refetch}
              disabled={refreshing}
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {togglingNetwork ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
                <span className="text-sm font-medium">Network</span>
                <Switch checked={networkEnabled} onCheckedChange={handleToggleNetwork} />
                <span className={`text-xs font-bold ${networkEnabled ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {networkEnabled ? "ON" : "OFF"}
                </span>
              </div>
            )}
            <Link href="/b2b">
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="w-4 h-4" /> B2B Portal
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Network disabled banner ── */}
        {!networkEnabled && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                Federated Network is disabled
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable the network to allow inter-store inventory visibility and ordering.
              </p>
            </div>
            <Button
              size="sm"
              className="ml-auto bg-amber-500 text-white hover:bg-amber-600 shrink-0"
              onClick={() => handleToggleNetwork(true)}
            >
              Enable Now
            </Button>
          </div>
        )}

        {/* ── Subscription notice ── */}
        <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-[var(--brand)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Full Network Access requires a Network Subscription</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Currently on free tier — limited to 3 stores and 50 inter-store orders/month.
            </p>
          </div>
          <Button size="sm" className="bg-[var(--brand)] text-white hover:opacity-90 gap-1.5 shrink-0">
            <Star className="w-3.5 h-3.5" /> Upgrade
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {/* Pending badge on Stores tab */}
              {key === "stores" && summary && summary.pendingRequests > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {summary.pendingRequests}
                </span>
              )}
              {/* Conflict badge on Transfers tab */}
              {key === "orders" && summary && summary.conflictFlags > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {summary.conflictFlags}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === "overview" && (
          <OverviewTab
            summary={summary}
            transfers={transfers}
            loading={loading}
            onTabChange={(tab) => {
              if (tab === "net-analytics") { router.push("/admin/network/net-analytics"); return; }
              setActiveTab(tab as typeof activeTab);
            }}
          />
        )}
        {activeTab === "stores" && (
          <StoresTab stores={stores} loading={loading} onRefetch={refetch} />
        )}
        {activeTab === "orders" && (
          <OrdersTab transfers={transfers} loading={loading} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            networkEnabled={networkEnabled}
            inventoryShare={inventoryShare}
            onToggleNetwork={handleToggleNetwork}
            onToggleInventory={setInventoryShare}
          />
        )}
      </div>
    </div>
  );
}