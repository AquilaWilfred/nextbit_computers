"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  Truck,
  Package,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  XCircle,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  Loader2,
} from "lucide-react";

// ─── Types (matching backend) ─────────────────────────────────────────────────

interface InsurancePolicy {
  id: number;
  policy_number: string;
  type: "goods_in_transit" | "device_protection";
  coverage_amount: number;
  premium_paid: number;
  status: "active" | "expired" | "claimed";
  expiry_date: string;
  order_id?: number;
  created_at: string;
}

interface Claim {
  id: number;
  claim_number: string;
  policy_id: number;
  client_name: string;
  claim_type: string;
  amount_requested: number;
  amount_approved?: number;
  status: "pending" | "approved" | "rejected";
  description: string;
  created_at: string;
  resolved_at?: string;
  rejection_reason?: string;
}

interface AdminStats {
  total_policies: number;
  active_policies: number;
  expired_policies: number;
  claimed_policies: number;
  transit_policies: number;
  device_policies: number;
  total_claims: number;
  pending_claims: number;
  approved_claims: number;
  rejected_claims: number;
  total_coverage: number;
  total_premiums_collected: number;
  total_claims_approved_amount: number;
  total_claims_pending_amount: number;
  total_clients: number;
}

// ─── API Service ─────────────────────────────────────────────────────────────

const API_BASE = "/api/admin/insurance";

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

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active: { variant: "default", label: "Active" },
    expired: { variant: "secondary", label: "Expired" },
    claimed: { variant: "outline", label: "Claimed" },
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
  };
  const cfg = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ─── Stat Card Component ────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accent ? "bg-opacity-10 bg-blue-50" : "bg-gray-50"}`}>
            <Icon className={`h-5 w-5 ${accent ?? "text-gray-400"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

type Tab = "overview" | "policies" | "claims";

export default function InsuranceAdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Filters
  const [policySearch, setPolicySearch] = useState("");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("all");
  const [policyTypeFilter, setPolicyTypeFilter] = useState("all");
  const [claimSearch, setClaimSearch] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState("all");

  // ── Fetch Functions ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<AdminStats>(`${API_BASE}/stats`);
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load stats", err);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (policyStatusFilter !== "all") params.set("status", policyStatusFilter);
      if (policyTypeFilter !== "all") params.set("policy_type", policyTypeFilter);
      if (policySearch) params.set("search", policySearch);
      
      const data = await apiFetch<InsurancePolicy[]>(`${API_BASE}/policies?${params}`);
      setPolicies(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load policies");
    }
  }, [policyStatusFilter, policyTypeFilter, policySearch]);

  const fetchClaims = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (claimStatusFilter !== "all") params.set("status", claimStatusFilter);
      if (claimSearch) params.set("search", claimSearch);
      
      const data = await apiFetch<Claim[]>(`${API_BASE}/claims?${params}`);
      setClaims(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load claims");
    }
  }, [claimStatusFilter, claimSearch]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchPolicies(), fetchClaims()]);
    setLoading(false);
  }, [fetchStats, fetchPolicies, fetchClaims]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Claim Review Action ────────────────────────────────────────────────────

  const handleClaimAction = async (claimId: number, action: "approved" | "rejected", amountApproved?: number, rejectionReason?: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`${API_BASE}/claims/${claimId}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          amount_approved: amountApproved,
          rejection_reason: rejectionReason,
        }),
      });
      toast.success(`Claim ${action} successfully`);
      setSelectedClaim(null);
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} claim`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filter Helpers ─────────────────────────────────────────────────────────

  const filteredPolicies = policies;
  const filteredClaims = claims;

  if (loading && !stats) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            NextBit Insurance — Admin
          </h1>
          <p className="text-gray-600 mt-1">
            Full visibility and control over all client policies and claims.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 mb-8 border-b">
        {(["overview", "policies", "claims"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t === "claims" && stats.pending_claims > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                {stats.pending_claims}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-8">
          {/* KPI Row — Policies */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Policies
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={BarChart3} label="Total" value={stats.total_policies} />
              <StatCard icon={CheckCircle} label="Active" value={stats.active_policies} accent="text-green-600" />
              <StatCard icon={Clock} label="Expired" value={stats.expired_policies} accent="text-gray-500" />
              <StatCard icon={Activity} label="Claimed" value={stats.claimed_policies} accent="text-orange-500" />
              <StatCard icon={Truck} label="Transit" value={stats.transit_policies} accent="text-blue-500" />
              <StatCard icon={Package} label="Device" value={stats.device_policies} accent="text-purple-500" />
            </div>
          </section>

          {/* KPI Row — Claims */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Claims
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Total Claims" value={stats.total_claims} />
              <StatCard icon={Clock} label="Pending" value={stats.pending_claims} accent="text-yellow-600" />
              <StatCard icon={CheckCircle} label="Approved" value={stats.approved_claims} accent="text-green-600" />
              <StatCard icon={XCircle} label="Rejected" value={stats.rejected_claims} accent="text-red-600" />
            </div>
          </section>

          {/* KPI Row — Financials */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Shield}
                label="Total Coverage Issued"
                value={`KES ${stats.total_coverage.toLocaleString()}`}
                accent="text-blue-600"
              />
              <StatCard
                icon={TrendingUp}
                label="Premiums Collected"
                value={`KES ${stats.total_premiums_collected.toLocaleString()}`}
                accent="text-green-600"
              />
              <StatCard
                icon={TrendingDown}
                label="Claims Paid Out"
                value={`KES ${stats.total_claims_approved_amount.toLocaleString()}`}
                accent="text-red-500"
              />
              <StatCard
                icon={Clock}
                label="Claims Pending (KES)"
                value={`KES ${stats.total_claims_pending_amount.toLocaleString()}`}
                accent="text-yellow-600"
              />
            </div>
          </section>

          {/* KPI — Clients */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Clients
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Unique Clients" value={stats.total_clients} accent="text-blue-600" />
              <StatCard
                icon={TrendingUp}
                label="Avg Premium / Client"
                value={`KES ${Math.round(stats.total_premiums_collected / stats.total_clients).toLocaleString()}`}
              />
              <StatCard
                icon={Shield}
                label="Avg Coverage / Client"
                value={`KES ${Math.round(stats.total_coverage / stats.total_clients).toLocaleString()}`}
              />
              <StatCard
                icon={Activity}
                label="Claim Rate"
                value={`${Math.round((stats.total_claims / stats.total_policies) * 100)}%`}
                sub="Claims per policy"
              />
            </div>
          </section>

          {/* Insurance Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5" /> Goods-in-Transit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Policies" value={stats.transit_policies} />
                <Row label="Coverage per policy" value="KES 50,000" />
                <Row label="Premium per policy" value="KES 500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5" /> Device Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Policies" value={stats.device_policies} />
                <Row label="Coverage per policy" value="KES 100,000" />
                <Row label="Premium per policy" value="KES 2,000" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── POLICIES TAB ── */}
      {tab === "policies" && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by policy number…"
                    value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                  />
                </div>
                <Select value={policyStatusFilter} onValueChange={setPolicyStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={policyTypeFilter} onValueChange={setPolicyTypeFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="goods_in_transit">Goods in Transit</SelectItem>
                    <SelectItem value="device_protection">Device Protection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Showing {filteredPolicies.length} of {stats.total_policies} policies
              </p>
            </CardContent>
          </Card>

          {/* Policy Count Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Shown", value: filteredPolicies.length },
              { label: "Active", value: filteredPolicies.filter((p) => p.status === "active").length, accent: "text-green-600" },
              { label: "Expired", value: filteredPolicies.filter((p) => p.status === "expired").length, accent: "text-gray-500" },
              { label: "Claimed", value: filteredPolicies.filter((p) => p.status === "claimed").length, accent: "text-orange-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.accent ?? "text-gray-900"}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Policies List */}
          <Card>
            <CardHeader>
              <CardTitle>All Policies</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPolicies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No policies match your filters.</p>
              ) : (
                <div className="space-y-4">
                  {filteredPolicies.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{policy.policy_number}</h3>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5 capitalize">
                            {policy.type.replace("_", " ")}
                            {policy.order_id && (
                              <span className="ml-2 text-gray-400">· Order #{policy.order_id}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={policy.status} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Coverage</span>
                          <p className="font-medium">KES {policy.coverage_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Premium</span>
                          <p className="font-medium">KES {policy.premium_paid.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Issued</span>
                          <p className="font-medium">{new Date(policy.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Expires</span>
                          <p className={`font-medium ${new Date(policy.expiry_date) < new Date() ? "text-red-500" : ""}`}>
                            {new Date(policy.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CLAIMS TAB ── */}
      {tab === "claims" && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by claim number…"
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                  />
                </div>
                <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Showing {filteredClaims.length} of {stats.total_claims} claims
              </p>
            </CardContent>
          </Card>

          {/* Claim Count Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Shown", value: filteredClaims.length },
              { label: "Pending", value: filteredClaims.filter((c) => c.status === "pending").length, accent: "text-yellow-600" },
              { label: "Approved", value: filteredClaims.filter((c) => c.status === "approved").length, accent: "text-green-600" },
              { label: "Rejected", value: filteredClaims.filter((c) => c.status === "rejected").length, accent: "text-red-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.accent ?? "text-gray-900"}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Claims List */}
          <Card>
            <CardHeader>
              <CardTitle>All Claims</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredClaims.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No claims match your filters.</p>
              ) : (
                <div className="space-y-4">
                  {filteredClaims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{claim.claim_number}</h3>
                            <span className="text-xs text-gray-400">
                              Policy #{claim.policy_id}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-700 mt-0.5">{claim.claim_type}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{claim.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={claim.status} />
                          <span className="text-sm font-semibold text-green-700">
                            KES {claim.amount_requested.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
                        <div className="flex items-center gap-4 text-gray-500">
                          <span>Filed: {new Date(claim.created_at).toLocaleDateString()}</span>
                          {claim.resolved_at && (
                            <span>Resolved: {new Date(claim.resolved_at).toLocaleDateString()}</span>
                          )}
                          {claim.status === "approved" && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" /> Approved
                            </span>
                          )}
                          {claim.status === "rejected" && claim.rejection_reason && (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-4 w-4" /> {claim.rejection_reason}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedClaim(claim)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> Review
                          </Button>
                          {claim.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleClaimAction(claim.id, "approved", claim.amount_requested)}
                                disabled={actionLoading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt("Please provide a reason for rejection:");
                                  if (reason) handleClaimAction(claim.id, "rejected", undefined, reason);
                                }}
                                disabled={actionLoading}
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Claim Review Modal ── */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Claim Review — {selectedClaim.claim_number}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Claim Number</Label>
                  <p className="font-medium">{selectedClaim.claim_number}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Policy ID</Label>
                  <p className="font-medium">{selectedClaim.policy_id}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Claim Type</Label>
                  <p className="font-medium">{selectedClaim.claim_type}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Amount Requested</Label>
                  <p className="font-semibold text-green-700">
                    KES {selectedClaim.amount_requested.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Filed</Label>
                  <p className="font-medium">{new Date(selectedClaim.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <StatusBadge status={selectedClaim.status} />
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Description</Label>
                <p className="mt-1 text-sm border rounded p-3 bg-gray-50">
                  {selectedClaim.description}
                </p>
              </div>

              {selectedClaim.status === "pending" && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Action Required
                  </h4>
                  <p className="text-sm text-gray-600">
                    Review the claim details above and approve or reject accordingly.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedClaim.status === "pending" && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleClaimAction(selectedClaim.id, "approved", selectedClaim.amount_requested)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt("Please provide a reason for rejection:");
                        if (reason) handleClaimAction(selectedClaim.id, "rejected", undefined, reason);
                      }}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className={selectedClaim.status === "pending" ? "" : "flex-1"}
                  onClick={() => setSelectedClaim(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}