"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { B2BRegistrationForm } from "@/components/B2BRegistrationForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  FileText,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Download,
  Plus,
  Search,
  Filter,
  Package,
  DollarSign,
  CreditCard,
  BarChart3,
  ClipboardList,
  Users2,
  Wallet,
  Globe2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type LPOStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "fulfilled"
  | "cancelled";

interface LPO {
  id: string;
  reference: string;
  description: string;
  amount: number;       // total incl. VAT
  taxAmount: number;    // VAT portion
  currency: string;
  status: LPOStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  dueDate?: string;
  company?: string;
}

interface B2BSummary {
  totalOrders: number;
  pendingApproval: number;
  totalSpend: number;
  totalSaved: number;
  currency: string;
  openLPOs: number;
  activeSuppliers: number;
  lastActivity: string;
}

interface Supplier {
  id: string;
  name: string;
  category?: string;
  lpoCount: number;
  totalSpend: number;
  status?: "preferred" | "active" | "inactive";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LPO_STATUS: Record<
  LPOStatus,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  draft:     { label: "Draft",     icon: Clock,        color: "text-muted-foreground", bg: "bg-muted border border-border" },
  submitted: { label: "Submitted", icon: Clock,        color: "text-amber-600",        bg: "bg-amber-500/10 border border-amber-400/30" },
  approved:  { label: "Approved",  icon: CheckCircle2, color: "text-emerald-600",      bg: "bg-emerald-500/10 border border-emerald-400/30" },
  rejected:  { label: "Rejected",  icon: XCircle,      color: "text-red-600",          bg: "bg-red-500/10 border border-red-400/30" },
  fulfilled: { label: "Fulfilled", icon: CheckCircle2, color: "text-blue-600",         bg: "bg-blue-500/10 border border-blue-400/30" },
  cancelled: { label: "Cancelled", icon: XCircle,      color: "text-red-500",          bg: "bg-red-500/10 border border-red-400/30" },
};

const NAV_TABS = [
  { key: "overview",   label: "Overview",   icon: TrendingUp },
  { key: "lpos",       label: "LPOs",       icon: ClipboardList },
  { key: "orders",     label: "Orders",     icon: ShoppingCart },
  { key: "invoices",   label: "Invoices",   icon: Receipt },
  { key: "reports",    label: "Tax Reports",icon: BarChart3 },
  { key: "suppliers",  label: "Suppliers",  icon: Users2 },
];

const formatKES = (n: number, currency = "KES") =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

const isValidId = (id?: string | null): id is string =>
  typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null";

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useSummary(enabled = true) {
  const [data, setData] = useState<B2BSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setHasAccount(null);
      return;
    }

    setLoading(true);
    fetch("/api/b2b/summary")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setHasAccount(false);
          return null;
        }
        setHasAccount(true);
        return r.json().catch(() => null);
      })
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [enabled]);

  return { data, loading, hasAccount };
}

function useLPOs() {
  const [lpos, setLPOs] = useState<LPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LPOStatus | "all">("all");

  const fetchLPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/lpos");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLPOs(Array.isArray(data) ? data : []);
    } catch {
      setLPOs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLPOs();
  }, [fetchLPOs]);

  const filtered = lpos.filter((l) => {
    const matchSearch =
      !search ||
      l.reference.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return {
    lpos: filtered,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch: fetchLPOs,
  };
}

function useSuppliers(refreshKey?: number) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/b2b/suppliers")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load suppliers");
        return r.json();
      })
      .catch(() => [])
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return { suppliers, loading };
}

interface LPOItemDetail {
  id: number;
  productId?: number;
  productName?: string;
  productCategory?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface LPODetail extends LPO {
  items: LPOItemDetail[];
  auditLogs: {
    id: number;
    action: string;
    userId: string | null;
    timestamp: string;
    notes?: string;
  }[];
}

interface InvoiceRow {
  id: string;
  reference: string;
  lpoReference?: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
}

// ─── New LPO Modal ────────────────────────────────────────────────────────────

function NewLPOModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    company: "",
    kraPin: "",
    billingAddress: "",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.company || !form.kraPin || !form.billingAddress || !form.dueDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/b2b/lpos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("LPO created successfully");
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to create LPO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Create New LPO</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Local Purchase Order
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="p-6 space-y-4">
          {[
            {
              label: "Company Name *",
              key: "company",
              placeholder: "e.g. Safaricom PLC",
              type: "text",
            },
            {
              label: "Company PIN / KRA Number *",
              key: "kraPin",
              placeholder: "e.g. P051234567B",
              type: "text",
            },
            {
              label: "Billing Address *",
              key: "billingAddress",
              placeholder: "Company registered address",
              type: "text",
            },
            {
              label: "Due Date *",
              key: "dueDate",
              placeholder: "",
              type: "date",
            },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {f.label}
              </label>
              <Input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Line items, quantities and pricing will be added after creation.
              VAT (16%) is calculated automatically.
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            <FileText className="w-4 h-4" />
            {saving ? "Creating…" : "Create LPO"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LPODetailModal({
  open,
  lpoId,
  onClose,
}: {
  open: boolean;
  lpoId: string | null;
  onClose: () => void;
}) {
  const [lpo, setLpo] = useState<LPODetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !isValidId(lpoId)) return;
    setLoading(true);
    setLpo(null);
    fetch(`/api/b2b/lpos/${lpoId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load LPO");
        return r.json();
      })
      .then((data) => setLpo(data))
      .catch(() => setLpo(null))
      .finally(() => setLoading(false));
  }, [open, lpoId]);

  const handleDownload = async () => {
    if (!isValidId(lpoId)) return;
    toast.promise(
      fetch(`/api/b2b/lpos/${lpoId}/pdf`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `LPO-${lpo?.reference ?? lpoId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }),
      {
        loading: "Generating PDF…",
        success: "Downloaded",
        error: "Failed to download",
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-3xl border border-border">
        <div className="p-6 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-xl">
              {loading ? "Loading LPO…" : lpo?.reference ?? "LPO Details"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              View the order summary and download the LPO PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!lpo || loading}>
              Download PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-2/5" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-40 bg-muted rounded animate-pulse" />
            </div>
          ) : !lpo ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Unable to load LPO details.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Company</p>
                  <p className="font-semibold mt-2">{lpo.company || "—"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="font-semibold mt-2 capitalize">{lpo.status}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
                  <p className="font-semibold mt-2">
                    {lpo.createdAt
                      ? new Date(lpo.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Subtotal</p>
                  <p className="font-semibold mt-2">
                    {formatKES(lpo.amount, lpo.currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">VAT</p>
                  <p className="font-semibold mt-2">
                    {formatKES(lpo.taxAmount, lpo.currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="font-semibold mt-2">
                    {formatKES(lpo.amount + lpo.taxAmount, lpo.currency)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Items</h3>
                {lpo.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No line items available.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lpo.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">{item.productName || `Product #${item.productId}`}</td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">
                              {formatKES(item.unitPrice, lpo.currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatKES(item.totalPrice, lpo.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Audit Log</h3>
                {lpo.auditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {lpo.auditLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="font-semibold mt-1">{log.action}</p>
                        {log.notes && <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Add Supplier Modal ───────────────────────────────────────────────────────

function AddSupplierModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    email: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/b2b/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Supplier added successfully");
        onCreated();
        onClose();
        setForm({ name: "", category: "", email: "", phone: "", address: "" });
      } else {
        toast.error("Failed to add supplier");
      }
    } catch (error) {
      toast.error("Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="font-semibold">Add New Supplier</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add a supplier to your approved vendor list.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Supplier Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter supplier name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Office Supplies, IT Equipment"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="supplier@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+254 XXX XXX XXX"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Physical address"
              className="mt-1"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? "Adding…" : "Add Supplier"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({
  summary,
  loading,
  onNewLPO,
  setActiveTab,
}: {
  summary: B2BSummary | null;
  loading: boolean;
  onNewLPO: () => void;
  setActiveTab: (tab: string) => void;
}) {
  const stats = summary
    ? [
        {
          label: "Total Orders",
          value: summary.totalOrders,
          icon: ShoppingCart,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Open LPOs",
          value: summary.openLPOs,
          icon: ClipboardList,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        {
          label: "Pending Approval",
          value: summary.pendingApproval,
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: `Total Spend (${summary.currency})`,
          value: formatKES(summary.totalSpend, summary.currency),
          icon: Wallet,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          label: `Total Saved (${summary.currency})`,
          value: formatKES(summary.totalSaved, summary.currency),
          icon: TrendingUp,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: "Active Suppliers",
          value: summary.activeSuppliers,
          icon: Users2,
          color: "text-teal-500",
          bg: "bg-teal-500/10",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))
          : stats.map((s) => (
              <Card key={s.label} className="p-5 border border-border">
                <div
                  className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}
                >
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </Card>
            ))}
      </div>

      {/* Quick actions */}
      <Card className="border border-border p-6">
        <h3 className="font-semibold mb-4 text-sm">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={onNewLPO}
            className="w-full justify-start gap-2"
          >
            <Plus className="w-4 h-4" />
            Raise New LPO
          </Button>
          <div className="w-full">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/api/b2b/statement";
                a.download = "statement.pdf";
                a.click();
              }}
            >
              <Download className="w-4 h-4" />
              Download Statement
            </Button>
          </div>
          <div onClick={() => setActiveTab("invoices")} className="w-full">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Receipt className="w-4 h-4" />
              View Invoices
            </Button>
          </div>
        </div>
      </Card>

      {/* Last activity */}
      {summary && (
        <p className="text-xs text-muted-foreground">
          Last activity: {summary.lastActivity}
        </p>
      )}
    </div>
  );
}

// ─── Tab: LPOs ────────────────────────────────────────────────────────────────

function LPOsTab({
  onNewLPO,
  onView,
}: {
  onNewLPO: () => void;
  onView: (lpoId: string) => void;
}) {
  const {
    lpos,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useLPOs();

  const STATUS_OPTIONS: (LPOStatus | "all")[] = [
    "all",
    "draft",
    "submitted",
    "approved",
    "rejected",
    "fulfilled",
    "cancelled",
  ];

  const handleDownload = async (lpo: LPO) => {
    if (!isValidId(lpo.id)) {
      toast.error("Invalid LPO selected.");
      return;
    }
    toast.promise(
      fetch(`/api/b2b/lpos/${lpo.id}/pdf`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `LPO-${lpo.reference}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }),
      {
        loading: "Generating PDF…",
        success: "Downloaded",
        error: "Failed to download",
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {s === "all" ? "All" : LPO_STATUS[s].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search LPOs…"
              className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary w-52"
            />
          </div>
          <Button size="sm" className="gap-1.5" onClick={onNewLPO}>
            <Plus className="w-3.5 h-3.5" /> New LPO
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[
                  "Reference",
                  "Company",
                  "Description",
                  "Items",
                  "Excl. VAT",
                  "VAT (16%)",
                  "Total",
                  "Status",
                  "Date",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : lpos.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center text-muted-foreground"
                  >
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No LPOs found.</p>
                  </td>
                </tr>
              ) : (
                lpos.map((lpo) => {
                  const s = LPO_STATUS[lpo.status];
                  const Icon = s.icon;
                  const excl = lpo.amount;
                  const total = lpo.amount + lpo.taxAmount;
                  return (
                    <tr
                      key={lpo.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {lpo.reference}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lpo.company ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-normal break-words">
                        {lpo.description}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-center">
                        {lpo.itemCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatKES(excl, lpo.currency)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatKES(lpo.taxAmount, lpo.currency)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatKES(total, lpo.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${s.bg} ${s.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(lpo.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              if (!isValidId(lpo.id)) {
                                toast.error("Invalid LPO selected.");
                                return;
                              }
                              onView(lpo.id);
                            }}
                          >
                            View
                          </Button>
                          <button
                            onClick={() => handleDownload(lpo)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

// ─── Tab: Tax Reports ─────────────────────────────────────────────────────────

function ReportsTab() {
  const REPORTS = [
    {
      title: "Monthly VAT Summary — Current Month",
      desc: "All purchases with 16% VAT breakdown",
      href: "/api/b2b/reports/vat/monthly",
    },
    {
      title: "Quarterly Report — Current Quarter",
      desc: "LPO and procurement quarterly summary",
      href: "/api/b2b/reports/quarterly",
    },
    {
      title: "Annual Report — FY Current",
      desc: "Full year LPO and procurement summary",
      href: "/api/b2b/reports/annual",
    },
    {
      title: "Supplier Statements",
      desc: "All transactions per supplier",
      href: "/api/b2b/reports/suppliers",
    },
  ];

  const handleDownload = (href: string, title: string) => {
    toast.promise(
      fetch(href)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${title.replace(/\s+/g, "-")}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }),
      {
        loading: "Generating report…",
        success: "Downloaded",
        error: "Failed to download",
      }
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-6">
        <h2 className="font-bold text-lg mb-1">Tax-Ready Reports</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Download VAT-compliant reports for KRA filing and corporate
          accounting.
        </p>
        <div className="space-y-3">
          {REPORTS.map((r) => (
            <div
              key={r.href}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.desc}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => handleDownload(r.href, r.title)}
              >
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">KRA Integration</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Connect your KRA iTax account for automatic VAT filing and
              real-time compliance tracking. Available on Business and
              Enterprise plans.
            </p>
            <Link href="/b2b/kra-connect">
              <Button
                size="sm"
                className="mt-3 bg-blue-500 text-white hover:bg-blue-600 gap-1.5"
              >
                <Globe2 className="w-3.5 h-3.5" /> Connect KRA iTax
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InvoicesTab() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/b2b/invoices")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch invoices");
        return r.json();
      })
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (invoiceId: string) => {
    toast.promise(
      fetch(`/api/b2b/invoices/${invoiceId}/pdf`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to download PDF");
          return r.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `invoice-${invoiceId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }),
      {
        loading: "Generating PDF…",
        success: "Downloaded",
        error: "Failed to download invoice",
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border p-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h2 className="text-lg font-semibold">Invoices</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review issued invoices and download official PDF documents.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">LPO</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Due</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{invoice.reference}</td>
                    <td className="px-4 py-3 text-sm">{invoice.lpoReference}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatKES(invoice.amount + invoice.taxAmount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{invoice.status}</td>
                    <td className="px-4 py-3 text-sm">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/b2b/invoices/${invoice.id}`)}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(invoice.id)}>
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Suppliers ───────────────────────────────────────────────────────────

function SuppliersTab({
  onAddSupplier,
  refreshKey,
}: {
  onAddSupplier: () => void;
  refreshKey?: number;
}) {
  const router = useRouter();
  const { suppliers, loading } = useSuppliers(refreshKey);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${suppliers.length} suppliers`}
        </p>
        <Button size="sm" className="gap-1.5" onClick={onAddSupplier}>
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border border-border">
          <Users2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-semibold text-sm">No suppliers yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first supplier to get started.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card
              key={s.id}
              className="p-5 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                {s.status === "preferred" && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                    Preferred
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{s.category}</p>
              <div className="grid grid-cols-2 gap-3 text-center py-3 border-y border-border">
                <div>
                  <p className="font-bold">{s.lpoCount}</p>
                  <p className="text-[10px] text-muted-foreground">LPOs</p>
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {formatKES(s.totalSpend)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Total Spend
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-3">
                <Link href={`/b2b/suppliers/${s.id}`}>
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    View Statement
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => router.push(`/b2b/lpos/new?company=${encodeURIComponent(s.name)}`)}
                >
                  Create LPO
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <Card className="border border-border p-12 flex flex-col items-center justify-center text-center">
      <Package className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        This section is being built. Check back soon.
      </p>
    </Card>
  );
}

function B2BLanding() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [pin, setPin] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);

  const handleContinue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/b2b/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl space-y-8">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 space-y-4">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                Corporate procurement
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Apply for B2B access or sign in with your corporate account.
              </h1>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                If your company already has a B2B account in our system, sign in and continue managing LPOs,
                invoices, and suppliers. If you are new, submit a corporate account application.
              </p>
            </div>
          </div>

          <form onSubmit={handleContinue} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Company passcode</label>
              <Input
                placeholder="Enter your company passcode"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Access PIN</label>
              <Input
                type="password"
                placeholder="Enter your PIN"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full bg-primary text-primary-foreground">
                <LogIn className="w-4 h-4 mr-2" /> Continue to sign in
              </Button>
              <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Building2 className="w-4 h-4 mr-2" /> Apply for a corporate account
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Apply for Corporate Account
                    </DialogTitle>
                    <DialogDescription>
                      Get access to credit terms, LPO management, VAT invoicing, and bulk pricing.
                    </DialogDescription>
                  </DialogHeader>
                  <B2BRegistrationForm onSuccess={() => setShowApplyModal(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </form>

          <div className="mt-8 rounded-2xl border border-border bg-muted p-5 text-sm text-muted-foreground">
            <p className="font-semibold">Account access flow</p>
            <p className="mt-2">
              If you have no B2B corporate account, create one by applying now. If you already have an account, enter your company passcode and access PIN to sign in. Otherwise, submit an application and wait for verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function B2BPortalPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: summary, loading: summaryLoading, hasAccount } = useSummary(!!user);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showNewLPO, setShowNewLPO] = useState(false);
  const [showLpoModal, setShowLpoModal] = useState(false);
  const [selectedLpoId, setSelectedLpoId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // If the visitor is not signed in, render a B2B landing page instead of the portal.
  if (!user) {
    return <B2BLanding />;
  }

  // Refetch LPO list after creation — lifted via key trick
  const [lpoKey, setLpoKey] = useState(0);
  const handleLPOCreated = () => setLpoKey((k) => k + 1);

  // Refetch suppliers list after creation
  const [supplierKey, setSupplierKey] = useState(0);
  const handleSupplierCreated = () => setSupplierKey((k) => k + 1);

  const openLpoModal = (id: string) => {
    if (!isValidId(id)) {
      toast.error("Unable to open LPO details. Invalid order reference.");
      return;
    }
    setSelectedLpoId(id);
    setShowLpoModal(true);
  };

  const closeLpoModal = () => {
    setShowLpoModal(false);
    setSelectedLpoId(null);
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────
  // Logged in but no approved B2B account
  if (!summaryLoading && user && hasAccount === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center mb-2">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <h1 className="text-2xl font-bold">No B2B Account Found</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Your account doesn&apos;t have an approved B2B profile yet. Apply now
            or contact support if you&apos;ve already submitted an application.
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Building2 className="w-4 h-4" /> Apply for Corporate Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Apply for Corporate Account
                </DialogTitle>
                <DialogDescription>
                  Get access to credit terms, LPO management, VAT invoicing, and bulk pricing.
                </DialogDescription>
              </DialogHeader>
              <B2BRegistrationForm onSuccess={() => setShowApplyModal(false)} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => logout()} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={`bg-secondary border-r border-border flex-col flex shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-sm font-bold leading-tight">B2B Portal</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Corporate Access
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="text-muted-foreground"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={`${sidebarCollapsed ? "hidden" : "block"}`}>{label}</span>
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t border-border space-y-2">
          {user && !sidebarCollapsed && (
            <div className="rounded-lg border border-border bg-card px-3 py-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Signed in as
              </p>
              <p className="text-sm font-semibold truncate">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full justify-start gap-2 px-3 text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold capitalize tracking-tight">
              {NAV_TABS.find((t) => t.key === activeTab)?.label ?? "B2B Portal"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Corporate procurement &amp; LPO management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
              <ShieldCheck className="w-3 h-3" /> Verified Corporate Account
            </Badge>
            <Link
              href="/admin/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Admin
            </Link>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Store
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === "overview" && (
            <OverviewTab
              summary={summary}
              loading={summaryLoading}
              onNewLPO={() => setShowNewLPO(true)}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "lpos" && (
            <LPOsTab
              key={lpoKey}
              onNewLPO={() => setShowNewLPO(true)}
              onView={openLpoModal}
            />
          )}
          {activeTab === "orders" && <PlaceholderTab label="Orders" />}
          {activeTab === "invoices" && <InvoicesTab />}
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "suppliers" && (
            <SuppliersTab
              refreshKey={supplierKey}
              onAddSupplier={() => setShowAddSupplier(true)}
              key={supplierKey}
            />
          )}

          {/* Account Application Info */}
          <div className="mt-12 pt-8 border-t border-border">
            <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-200/20 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Corporate Account Application
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-md">
                    Need to register a new corporate entity? Submit an application to get started with LPO management,
                    supplier integration, and tax reporting.
                  </p>
                </div>
                <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 whitespace-nowrap">
                      <Plus className="w-4 h-4" />
                      Apply Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" /> Apply for Corporate Account
                      </DialogTitle>
                      <DialogDescription>
                        Get access to credit terms, LPO management, VAT invoicing, and bulk pricing.
                      </DialogDescription>
                    </DialogHeader>
                    <B2BRegistrationForm onSuccess={() => setShowApplyModal(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Add Supplier Modal */}
      <AddSupplierModal
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        onCreated={handleSupplierCreated}
      />
      <NewLPOModal
        open={showNewLPO}
        onClose={() => setShowNewLPO(false)}
        onCreated={() => {
          handleLPOCreated();
          setShowNewLPO(false);
        }}
      />
      <LPODetailModal open={showLpoModal} lpoId={selectedLpoId} onClose={closeLpoModal} />
    </div>
  );
}