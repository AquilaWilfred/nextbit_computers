"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Loader2, Building2, User, Mail, Phone, MapPin, Globe2, FileText, MessageSquare, Eye, CheckCircle2, XCircle } from "lucide-react";
import { B2BApplication, AppStatus } from "@/types/b2b.applications.types";
import { APP_STATUS, PAYMENT_TERMS, REQUIRED_DOCUMENTS } from "@/constants/b2b.applications.consntants";
import { formatDate, formatCurrency } from "@/lib/utils/b2bApplications.utils";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { CreditTermsForm } from "./CreditTermsForm";

interface ApplicationDetailProps {
  app: B2BApplication;
  onClose: () => void;
  onStatusChange: (id: string, status: AppStatus, opts?: any) => Promise<void>;
  onDocumentVerify: (key: string, verified: boolean) => Promise<void>;
}

export function ApplicationDetail({
  app,
  onClose,
  onStatusChange,
  onDocumentVerify,
}: ApplicationDetailProps) {
  const [viewingDoc, setViewingDoc] = useState<B2BApplication["documents"][0] | null>(null);
  const [notes, setNotes] = useState(app.reviewNotes ?? "");
  const [creditLimit, setCreditLimit] = useState(app.creditLimit?.toString() ?? "500000");
  const [paymentTerms, setPaymentTerms] = useState<string>(app.paymentTerms ?? "net_30");
  const [acting, setActing] = useState<string | null>(null);

  const isRequiredVerified = REQUIRED_DOCUMENTS.every(
    (key) => app.documents.find((d) => d.key === key)?.verified
  );

  const handleAction = async (status: AppStatus) => {
    setActing(status);
    try {
      await onStatusChange(app.id, status, {
        notes,
        creditLimit: status === "approved" ? parseInt(creditLimit) : undefined,
        paymentTerms: status === "approved" ? paymentTerms : undefined,
      });
    } finally {
      setActing(null);
    }
  };

  const handleVerifyDocument = useCallback(
    async (key: string, verified: boolean) => {
      await onDocumentVerify(key, verified);
    },
    [onDocumentVerify]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{app.company.name}</h2>
            <ApplicationStatusBadge status={app.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            Ref: <span className="font-mono font-semibold">{app.referenceNumber}</span>
            {" · "}Submitted {formatDate(app.submittedAt, "long")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
          <X className="w-4 h-4" /> Close
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Company Info */}
          <Card className="p-5 border-border">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> Company
            </h3>
            <div className="space-y-2.5 text-sm">
              <InfoRow label="KRA PIN" value={app.company.kraPin} />
              <InfoRow label="Reg. No." value={app.company.registrationNumber} />
              {app.company.vatNumber && <InfoRow label="VAT No." value={app.company.vatNumber} />}
              <InfoRow label="Industry" value={app.company.industry} />
              <InfoRow
                label="Address"
                value={`${app.company.physicalAddress}, ${app.company.city}`}
                icon={MapPin}
              />
              {app.company.website && <InfoRow label="Website" value={app.company.website} icon={Globe2} />}
            </div>
          </Card>

          {/* Contacts */}
          <Card className="p-5 border-border">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> Contacts
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Primary
                </p>
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold">{app.primaryContact.fullName}</p>
                  <p className="text-muted-foreground text-xs">
                    {app.primaryContact.title} · {app.primaryContact.department}
                  </p>
                  <InfoRow label="Email" value={app.primaryContact.email} icon={Mail} small />
                  <InfoRow label="Phone" value={app.primaryContact.phone} icon={Phone} small />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Finance
                </p>
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold">{app.financeContact.fullName}</p>
                  <InfoRow label="Email" value={app.financeContact.email} icon={Mail} small />
                  <InfoRow label="Phone" value={app.financeContact.phone} icon={Phone} small />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Documents */}
          <Card className="p-5 border-border">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Documents
            </h3>
            <div className="space-y-2">
              {app.documents.map((doc) => {
                const isVerified = doc.verified;
                return (
                  <div
                    key={doc.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isVerified ? "border-emerald-500/20 bg-emerald-500/5" : "border-border"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isVerified ? "bg-emerald-500/10" : "bg-muted"
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{doc.label}</p>
                      {isVerified && (
                        <p className="text-[10px] text-emerald-600">Verified</p>
                      )}
                    </div>
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="View document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            {!isRequiredVerified && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                Verify all 3 required documents before approving
              </div>
            )}
          </Card>

          {/* Review Notes */}
          <Card className="p-5 border-border">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" /> Review Notes
            </h3>
            <textarea
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="Internal notes about this application, or reason for rejection / request for more info…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>

          {/* Credit Terms */}
          {(app.status === "pending" || app.status === "under_review") && (
            <CreditTermsForm
              creditLimit={creditLimit}
              onCreditLimitChange={setCreditLimit}
              paymentTerms={paymentTerms}
              onPaymentTermsChange={setPaymentTerms}
            />
          )}
        </div>
      </div>

      {/* Decision Buttons */}
      {(app.status === "pending" || app.status === "under_review" || app.status === "more_info_needed") && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("under_review")}
            disabled={!!acting}
            className="gap-1.5"
          >
            {acting === "under_review" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Mark Under Review
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("more_info_needed")}
            disabled={!!acting}
            className="gap-1.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
          >
            {acting === "more_info_needed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
            Request More Info
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("rejected")}
            disabled={!!acting}
            className="gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
          >
            {acting === "rejected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => handleAction("approved")}
            disabled={!!acting || !isRequiredVerified}
            className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
            title={!isRequiredVerified ? "Verify all required documents first" : undefined}
          >
            {acting === "approved" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve & Activate
          </Button>
        </div>
      )}

      {/* Already Decided State */}
      {(app.status === "approved" || app.status === "rejected") && (
        <div
          className={`rounded-lg border p-4 ${
            app.status === "approved"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {app.status === "approved" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <p className="text-sm font-semibold">
              {app.status === "approved"
                ? `Approved — Credit limit ${formatCurrency(app.creditLimit ?? 0)}, ${PAYMENT_TERMS[app.paymentTerms ?? "net_30"].label}`
                : "Application rejected"}
            </p>
          </div>
          {app.reviewNotes && (
            <p className="text-xs text-muted-foreground ml-6">{app.reviewNotes}</p>
          )}
          {app.reviewedBy && (
            <p className="text-xs text-muted-foreground ml-6 mt-1">
              by {app.reviewedBy} · {formatDate(app.updatedAt)}
            </p>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onVerify={() => handleVerifyDocument(viewingDoc.key, true)}
          onUnverify={() => handleVerifyDocument(viewingDoc.key, false)}
        />
      )}
    </div>
  );
}

// Helper component for info rows
function InfoRow({
  label,
  value,
  icon: Icon,
  small = false,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <span className="text-muted-foreground w-4 shrink-0 pt-0.5"><Icon className="w-3 h-3" /></span>}
      <span className="text-muted-foreground w-20 shrink-0 text-xs pt-0.5">{label}</span>
      <span className={`font-medium break-all ${small ? "text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}