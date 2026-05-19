// app/(admin-group)/admin/b2b/applications/page.tsx

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Building2, ShieldCheck, RefreshCw, ChevronRight } from "lucide-react";
import { B2BRegistrationForm } from "@/components/B2BRegistrationForm";
import { useApplications } from "@/hooks/b2b/useApplications";
import { useApplicationStatus } from "@/hooks/b2b/useApplicationStatus";
import { ApplicationDetail } from "@/components/b2b/ApplicationDetail";
import { ApplicationStatusBadge } from "@/components/b2b/ApplicationStatusBadge";
import { APP_STATUS, STATUS_OPTIONS } from "@/constants/b2b.applications.consntants";
import { formatDate } from "@/lib/utils/b2bApplications.utils";
import { AppStatus } from "@/types/b2b.applications.types";

export default function AdminB2BApplicationsPage() {
  const { applications, loading, refreshing, refetch, pendingCount } = useApplications();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { updateStatus } = useApplicationStatus(refetch);

  const handleStatusChange = async (id: string, status: AppStatus, opts?: any) => {
    await updateStatus(id, status, opts);
  };

  const handleDocumentVerify = async () => {
    await refetch();
  };

  const filtered = applications.filter((app) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      app.company.name.toLowerCase().includes(query) ||
      app.company.kraPin.toLowerCase().includes(query) ||
      app.referenceNumber.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selected = applications.find((app) => app.id === selectedId) ?? null;

  if (selected) {
    return (
      <div>
        <ApplicationDetail
          app={selected}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          onDocumentVerify={handleDocumentVerify}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-[var(--brand)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                B2B Applications
              </span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Corporate Account Applications</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Review and approve corporate B2B account registrations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Apply Now
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
                <B2BRegistrationForm
                  onSuccess={() => {
                    setShowApplyModal(false);
                    refetch();
                  }}
                />
              </DialogContent>
            </Dialog>

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
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {STATUS_OPTIONS.map((status) => {
              const count =
                status === "all"
                  ? applications.length
                  : applications.filter((a) => a.status === status).length;
              const label = status === "all" ? "Total" : APP_STATUS[status as AppStatus].label;
              return (
                <Card
                  key={status}
                  className={`p-4 cursor-pointer transition-all hover:border-primary/40 ${
                    statusFilter === status ? "border-primary" : "border-border"
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  <p className="text-2xl font-bold tabular-nums">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, KRA PIN, or reference…"
              className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {status === "all" ? "All" : APP_STATUS[status as AppStatus].label}
              </button>
            ))}
          </div>
        </div>

        {/* Applications Table */}
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Reference
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    KRA PIN
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Industry
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Primary Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Submitted
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Documents
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No applications found.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((app) => {
                    const verifiedCount = app.documents.filter((d) => d.verified).length;
                    const allVerified = verifiedCount === app.documents.length;
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedId(app.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--brand)]">
                          {app.referenceNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold">{app.company.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{app.company.kraPin}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {app.company.industry}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium">{app.primaryContact.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {app.primaryContact.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(app.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold ${
                              allVerified ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {verifiedCount}/{app.documents.length} verified
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ApplicationStatusBadge status={app.status} showIcon />
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}