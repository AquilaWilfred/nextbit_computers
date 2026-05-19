"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle, Clock, MessageSquare, Phone, Mail,
  Paperclip, ChevronDown, ChevronUp, Search, Filter, ArrowUpCircle,
  Star, User, ThumbsUp, ThumbsDown, FileText, X, Send,
  Download, ExternalLink, Wrench, Shield, RefreshCw, Package,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "pending" | "investigating" | "resolved" | "escalated";

interface Attachment {
  name: string;
  size: number;
  type: string;
  /** Replace with actual upload URL after wiring to backend */
  url?: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: "user" | "agent" | "system";
  actorName: string;
  type: "status_change" | "message" | "attachment" | "escalation" | "resolution_proposed" | "resolution_accepted" | "resolution_rejected";
  content: string;
  attachments?: Attachment[];
}

interface ConflictReport {
  id: string;
  type: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  referenceId?: string;       // e.g. order ID, repair ticket, claim number
  referenceType?: string;
  assignedAgent?: string;
  slaDeadline?: string;       // ISO string
  resolution?: string;
  resolutionStatus?: "pending_acceptance" | "accepted" | "rejected";
  satisfactionRating?: number;
  satisfactionComment?: string;
  attachments: Attachment[];
  timeline: TimelineEvent[];
}

// ─────────────────────────────────────────────
// MOCK DATA  (replace with API calls)
// ─────────────────────────────────────────────

const mockConflicts: ConflictReport[] = [
  {
    id: "CR-2024-001",
    type: "repair-service",
    title: "Repair Service Quality Dispute",
    description: "Technician completed repair but device still has issues. Customer claims work was substandard.",
    status: "investigating",
    priority: "high",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-16T14:20:00Z",
    referenceId: "RPR-7821",
    referenceType: "repair_ticket",
    assignedAgent: "Grace Wambui",
    slaDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    attachments: [
      { name: "repair_invoice.pdf", size: 124000, type: "application/pdf" },
    ],
    timeline: [
      {
        id: "t1", timestamp: "2024-01-15T10:30:00Z", actor: "user", actorName: "You",
        type: "message", content: "Filed conflict report regarding poor repair quality.",
      },
      {
        id: "t2", timestamp: "2024-01-15T11:00:00Z", actor: "system", actorName: "System",
        type: "status_change", content: "Status changed to Investigating.",
      },
      {
        id: "t3", timestamp: "2024-01-16T14:20:00Z", actor: "agent", actorName: "Grace Wambui",
        type: "message",
        content: "Thank you for reporting this. We have contacted the technician and are reviewing the repair logs. Please share any photos of the device issues.",
      },
    ],
  },
  {
    id: "CR-2024-002",
    type: "insurance-claim",
    title: "Insurance Claim Delay",
    description: "Device insurance claim filed 2 weeks ago, no response from claims department.",
    status: "escalated",
    priority: "urgent",
    createdAt: "2024-01-14T09:15:00Z",
    updatedAt: "2024-01-17T08:00:00Z",
    referenceId: "INS-CLM-4432",
    referenceType: "insurance_claim",
    assignedAgent: "David Mwangi",
    slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    timeline: [
      {
        id: "t1", timestamp: "2024-01-14T09:15:00Z", actor: "user", actorName: "You",
        type: "message", content: "Filed conflict report for delayed insurance claim.",
      },
      {
        id: "t2", timestamp: "2024-01-17T08:00:00Z", actor: "agent", actorName: "David Mwangi",
        type: "escalation", content: "Case escalated to senior claims team due to extended delay beyond SLA.",
      },
    ],
  },
  {
    id: "CR-2024-003",
    type: "e-waste-tradein",
    title: "Trade-in Value Disagreement",
    description: "Customer disagrees with offered trade-in value for old device. Claims valuation is too low.",
    status: "resolved",
    priority: "low",
    createdAt: "2024-01-10T16:45:00Z",
    updatedAt: "2024-01-12T11:30:00Z",
    referenceId: "TRD-991",
    referenceType: "trade_in",
    assignedAgent: "Mercy Atieno",
    resolution: "Agreed to increase trade-in value by 15% and provided additional recycling credits.",
    resolutionStatus: "accepted",
    satisfactionRating: 4,
    attachments: [],
    timeline: [
      {
        id: "t1", timestamp: "2024-01-10T16:45:00Z", actor: "user", actorName: "You",
        type: "message", content: "Dispute over trade-in valuation.",
      },
      {
        id: "t2", timestamp: "2024-01-11T09:00:00Z", actor: "agent", actorName: "Mercy Atieno",
        type: "resolution_proposed",
        content: "We are proposing a 15% increase on the trade-in value plus KES 500 recycling credits.",
      },
      {
        id: "t3", timestamp: "2024-01-12T11:30:00Z", actor: "user", actorName: "You",
        type: "resolution_accepted", content: "Resolution accepted.",
      },
    ],
  },
];

const conflictTypes = [
  { value: "repair-service", label: "Repair Service Dispute" },
  { value: "insurance-claim", label: "Insurance Claim Issue" },
  { value: "e-waste-tradein", label: "E-Waste Trade-in Dispute" },
  { value: "card-service", label: "Card Service Issue" },
  { value: "vip-service", label: "VIP Service Complaint" },
  { value: "device-diagnostic", label: "Device Diagnostic Error" },
  { value: "payment-dispute", label: "Payment Dispute" },
  { value: "other", label: "Other Conflict" },
];

const referenceTypes = [
  { value: "repair_ticket", label: "Repair Ticket" },
  { value: "insurance_claim", label: "Insurance Claim" },
  { value: "order", label: "Order" },
  { value: "trade_in", label: "Trade-in" },
  { value: "device_serial", label: "Device Serial" },
];

const SLA_HOURS: Record<Priority, number> = {
  urgent: 2,
  high: 4,
  medium: 24,
  low: 72,
};

// ─────────────────────────────────────────────
// MOCK ENTITY DATA  (replace with API fetches)
// ─────────────────────────────────────────────

interface EntityPreview {
  label: string;
  icon: "repair" | "insurance" | "trade" | "order" | "device";
  fields: { key: string; value: string; highlight?: boolean }[];
  statusLabel: string;
  statusColor: string;
  externalUrl?: string;
}

const mockEntityPreviews: Record<string, EntityPreview> = {
  "RPR-7821": {
    label: "Repair Ticket",
    icon: "repair",
    statusLabel: "In Review",
    statusColor: "bg-blue-100 text-blue-800",
    externalUrl: "/admin/repairs/RPR-7821",
    fields: [
      { key: "Device", value: "Lenovo ThinkPad X1 Carbon" },
      { key: "Issue", value: "Screen flickering + keyboard unresponsive" },
      { key: "Technician", value: "Brian Odhiambo" },
      { key: "Quoted", value: "KES 8,500", highlight: true },
      { key: "Received", value: "Jan 12, 2024" },
    ],
  },
  "INS-CLM-4432": {
    label: "Insurance Claim",
    icon: "insurance",
    statusLabel: "Pending Review",
    statusColor: "bg-yellow-100 text-yellow-800",
    externalUrl: "/admin/insurance/INS-CLM-4432",
    fields: [
      { key: "Policy No.", value: "NB-POL-8821" },
      { key: "Device", value: "MacBook Pro 14\" M2" },
      { key: "Incident", value: "Water damage" },
      { key: "Claim Amount", value: "KES 145,000", highlight: true },
      { key: "Filed", value: "Jan 1, 2024" },
    ],
  },
  "TRD-991": {
    label: "Trade-in",
    icon: "trade",
    statusLabel: "Completed",
    statusColor: "bg-green-100 text-green-800",
    externalUrl: "/admin/tradein/TRD-991",
    fields: [
      { key: "Device", value: "HP EliteBook 840 G5" },
      { key: "Condition", value: "Good (Grade B)" },
      { key: "Initial Offer", value: "KES 22,000" },
      { key: "Final Value", value: "KES 25,300", highlight: true },
      { key: "Recycling Credits", value: "KES 500" },
    ],
  },
};

// ─────────────────────────────────────────────
// PDF EXPORT UTILITY
// ─────────────────────────────────────────────

function exportReportAsPdf(conflict: ConflictReport) {
  // TODO: replace with server-side PDF endpoint:
  // GET /api/conflicts/:id/export.pdf → returns PDF blob
  // For now: generate a printable HTML window the user can Save as PDF

  const lines = conflict.timeline.map(
    (e) =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap;color:#666;font-size:12px">
          ${new Date(e.timestamp).toLocaleString()}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:600;font-size:12px;white-space:nowrap">
          ${e.actorName}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${e.content}</td>
      </tr>`
  ).join("");

  const attachmentList = conflict.attachments.length
    ? conflict.attachments.map((a) => `<li>${a.name} (${formatBytes(a.size)})</li>`).join("")
    : "<li>None</li>";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Conflict Report ${conflict.id}</title>
  <style>
    body{font-family:sans-serif;padding:40px;color:#111;max-width:800px;margin:auto}
    h1{font-size:22px;margin-bottom:4px}
    h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;margin-bottom:16px}
    .meta span{color:#555}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:6px 8px;background:#f4f4f4;font-size:12px;color:#444}
    ul{font-size:13px;margin:0;padding-left:20px}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
    @media print{body{padding:20px}}
  </style>
</head>
<body>
  <h1>NextBit Conflict Report</h1>
  <p style="color:#555;font-size:13px;margin:0 0 20px">${conflict.id} · Generated ${new Date().toLocaleString()}</p>
  <div class="meta">
    <div><span>Title</span><br/><strong>${conflict.title}</strong></div>
    <div><span>Type</span><br/><strong>${conflict.type}</strong></div>
    <div><span>Status</span><br/><strong>${conflict.status.toUpperCase()}</strong></div>
    <div><span>Priority</span><br/><strong>${conflict.priority.toUpperCase()}</strong></div>
    <div><span>Assigned Agent</span><br/><strong>${conflict.assignedAgent ?? "Unassigned"}</strong></div>
    <div><span>Reference</span><br/><strong>${conflict.referenceId ?? "—"} ${conflict.referenceType ? `(${conflict.referenceType})` : ""}</strong></div>
    <div><span>Created</span><br/><strong>${new Date(conflict.createdAt).toLocaleString()}</strong></div>
    <div><span>Last Updated</span><br/><strong>${new Date(conflict.updatedAt).toLocaleString()}</strong></div>
  </div>
  <h2>Description</h2>
  <p style="font-size:13px">${conflict.description}</p>
  ${conflict.resolution ? `<h2>Resolution</h2><p style="font-size:13px">${conflict.resolution}</p>` : ""}
  <h2>Activity Timeline</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Actor</th><th>Event</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <h2>Attachments</h2>
  <ul>${attachmentList}</ul>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const priorityColors: Record<Priority, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors: Record<Status, string> = {
  pending: "bg-gray-100 text-gray-800",
  investigating: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  escalated: "bg-red-100 text-red-800",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimeRemaining(deadline: string): { label: string; urgent: boolean } {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { label: "SLA breached", urgent: true };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return { label: `${m}m remaining`, urgent: true };
  if (h < 4) return { label: `${h}h ${m}m remaining`, urgent: true };
  return { label: `${h}h remaining`, urgent: false };
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "pending": return <Clock className="h-4 w-4 text-gray-500" />;
    case "investigating": return <AlertCircle className="h-4 w-4 text-blue-600" />;
    case "resolved": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "escalated": return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
  }
}

function TimelineIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "status_change": return <Clock className="h-3.5 w-3.5" />;
    case "message": return <MessageSquare className="h-3.5 w-3.5" />;
    case "attachment": return <Paperclip className="h-3.5 w-3.5" />;
    case "escalation": return <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />;
    case "resolution_proposed": return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
    case "resolution_accepted": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    case "resolution_rejected": return <X className="h-3.5 w-3.5 text-red-500" />;
  }
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function SlaTimer({ deadline, priority }: { deadline: string; priority: Priority }) {
  const { label, urgent } = getTimeRemaining(deadline);
  const totalMs = SLA_HOURS[priority] * 3600000;
  const remainMs = Math.max(0, new Date(deadline).getTime() - Date.now());
  const pct = Math.round((remainMs / totalMs) * 100);

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">SLA Response Time</span>
        <span className={urgent ? "text-red-600 font-medium" : "text-gray-600"}>{label}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${urgent ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            n <= (hovered || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}

function EntityIcon({ icon }: { icon: EntityPreview["icon"] }) {
  const cls = "h-5 w-5";
  switch (icon) {
    case "repair": return <Wrench className={cls} />;
    case "insurance": return <Shield className={cls} />;
    case "trade": return <RefreshCw className={cls} />;
    case "order": return <Package className={cls} />;
    case "device": return <FileText className={cls} />;
  }
}

function EntityPreviewCard({ referenceId, externalUrl }: { referenceId: string; externalUrl?: string }) {
  // TODO: replace mockEntityPreviews lookup with:
  // const entity = await fetch(`/api/entities/${referenceId}`).then(r => r.json())
  const entity = mockEntityPreviews[referenceId];
  if (!entity) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <EntityIcon icon={entity.icon} />
          <span>{entity.label}</span>
          <span className="font-mono text-xs text-gray-400">{referenceId}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={entity.statusColor}>{entity.statusLabel}</Badge>
          {entity.externalUrl && (
            <a href={entity.externalUrl} className="text-gray-400 hover:text-blue-600">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {entity.fields.map((f) => (
          <div key={f.key}>
            <p className="text-xs text-gray-400">{f.key}</p>
            <p className={`text-sm ${f.highlight ? "font-semibold text-blue-700" : "text-gray-800"}`}>
              {f.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORT DETAIL PANEL
// ─────────────────────────────────────────────

function ReportDetail({
  conflict,
  onClose,
  onAddMessage,
  onEscalate,
  onAcceptResolution,
  onRejectResolution,
  onRateResolution,
}: {
  conflict: ConflictReport;
  onClose: () => void;
  onAddMessage: (id: string, text: string, files: Attachment[]) => void;
  onEscalate: (id: string, reason: string) => void;
  onAcceptResolution: (id: string) => void;
  onRejectResolution: (id: string, reason: string) => void;
  onRateResolution: (id: string, rating: number, comment: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rating, setRating] = useState(conflict.satisfactionRating ?? 0);
  const [ratingComment, setRatingComment] = useState(conflict.satisfactionComment ?? "");
  const [ratingSubmitted, setRatingSubmitted] = useState(!!conflict.satisfactionRating);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const attachments: Attachment[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setPendingFiles((prev) => [...prev, ...attachments]);
  };

  const sendMessage = () => {
    if (!message.trim() && pendingFiles.length === 0) return;
    onAddMessage(conflict.id, message, pendingFiles);
    setMessage("");
    setPendingFiles([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon status={conflict.status} />
              <span className="font-semibold text-lg">{conflict.title}</span>
            </div>
            <p className="text-sm text-gray-500">{conflict.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReportAsPdf(conflict)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
              title="Export as PDF"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <Badge className={statusColors[conflict.status]}>
                {conflict.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Priority</p>
              <Badge className={priorityColors[conflict.priority]}>
                {conflict.priority.toUpperCase()}
              </Badge>
            </div>
            {conflict.referenceId && (
              <div>
                <p className="text-gray-500 mb-1">Reference</p>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {conflict.referenceId}
                </span>
              </div>
            )}
            {conflict.assignedAgent && (
              <div>
                <p className="text-gray-500 mb-1">Assigned Agent</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>{conflict.assignedAgent}</span>
                </div>
              </div>
            )}
          </div>

          {/* Entity preview */}
          {conflict.referenceId && (
            <EntityPreviewCard
              referenceId={conflict.referenceId}
              externalUrl={conflict.referenceType}
            />
          )}

          {/* SLA */}
          {conflict.slaDeadline && conflict.status !== "resolved" && (
            <SlaTimer deadline={conflict.slaDeadline} priority={conflict.priority} />
          )}

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{conflict.description}</p>
          </div>

          {/* Attachments */}
          {conflict.attachments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
              <div className="space-y-2">
                {conflict.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate">{att.name}</span>
                    <span className="text-gray-400 text-xs">{formatBytes(att.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution pending acceptance */}
          {conflict.resolutionStatus === "pending_acceptance" && conflict.resolution && (
            <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
              <p className="font-semibold text-yellow-800 mb-1">Resolution Proposed</p>
              <p className="text-sm text-yellow-700 mb-3">{conflict.resolution}</p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => onAcceptResolution(conflict.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> Accept Resolution
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowRejectForm(true)}
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
              {showRejectForm && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Why are you rejecting this resolution?"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRejectResolution(conflict.id, rejectReason);
                      setShowRejectForm(false);
                    }}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Accepted resolution */}
          {conflict.resolutionStatus === "accepted" && conflict.resolution && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-1">Resolution Accepted</p>
              <p className="text-sm text-green-700">{conflict.resolution}</p>
            </div>
          )}

          {/* Satisfaction rating */}
          {conflict.status === "resolved" && (
            <div className="border rounded-lg p-4">
              <p className="font-medium mb-2">Rate this resolution</p>
              {ratingSubmitted ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Thank you for your feedback ({rating}/5 stars)</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <StarRating value={rating} onChange={setRating} />
                  <Textarea
                    placeholder="Any additional comments? (optional)"
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={rating === 0}
                    onClick={() => {
                      onRateResolution(conflict.id, rating, ratingComment);
                      setRatingSubmitted(true);
                    }}
                  >
                    Submit Feedback
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Activity Timeline</p>
            <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
              {conflict.timeline.map((event) => (
                <div key={event.id} className="flex gap-3 pl-5 relative">
                  <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
                    <TimelineIcon type={event.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                      <span
                        className={`font-medium ${
                          event.actor === "agent"
                            ? "text-blue-600"
                            : event.actor === "system"
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        {event.actorName}
                      </span>
                      <span>·</span>
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{event.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escalate */}
          {conflict.status !== "resolved" && conflict.status !== "escalated" && (
            <div className="border rounded-lg p-4">
              <button
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                onClick={() => setShowEscalateForm(!showEscalateForm)}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Escalate this case
              </button>
              {showEscalateForm && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Reason for escalation…"
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onEscalate(conflict.id, escalateReason);
                      setShowEscalateForm(false);
                    }}
                  >
                    Confirm Escalation
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Reply composer */}
          {conflict.status !== "resolved" && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Add a message</p>
              <Textarea
                placeholder="Provide additional information or ask a follow-up question…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mb-2 text-sm"
              />
              {pendingFiles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={sendMessage} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-xs text-gray-400">Attach images, receipts, invoices</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function ConflictResolutionPage() {
  const [conflicts, setConflicts] = useState<ConflictReport[]>(mockConflicts);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    priority: "medium" as Priority,
    referenceId: "",
    referenceType: "",
  });
  const [formFiles, setFormFiles] = useState<Attachment[]>([]);

  const selectedConflict = conflicts.find((c) => c.id === selectedId) ?? null;

  // ── Filters ──

  const filtered = conflicts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.referenceId ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchPriority = filterPriority === "all" || c.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // ── Form submit ──

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slaHours = SLA_HOURS[formData.priority];
    const newConflict: ConflictReport = {
      id: `CR-2024-${String(conflicts.length + 1).padStart(3, "0")}`,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      status: "pending",
      priority: formData.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      referenceId: formData.referenceId || undefined,
      referenceType: formData.referenceType || undefined,
      slaDeadline: new Date(Date.now() + slaHours * 3600000).toISOString(),
      attachments: formFiles,
      timeline: [
        {
          id: "t1",
          timestamp: new Date().toISOString(),
          actor: "user",
          actorName: "You",
          type: "message",
          content: formData.description,
          attachments: formFiles,
        },
        {
          id: "t2",
          timestamp: new Date().toISOString(),
          actor: "system",
          actorName: "System",
          type: "status_change",
          content: "Conflict report submitted. SLA timer started.",
        },
      ],
    };
    // TODO: POST /api/conflicts → replace with API call
    setConflicts([newConflict, ...conflicts]);
    setFormData({ type: "", title: "", description: "", priority: "medium", referenceId: "", referenceType: "" });
    setFormFiles([]);
    setShowForm(false);
  };

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setFormFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    ]);
  };

  // ── Actions on existing reports ──

  const addMessage = (id: string, text: string, attachments: Attachment[]) => {
    // TODO: POST /api/conflicts/:id/messages
    setConflicts((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              updatedAt: new Date().toISOString(),
              timeline: [
                ...c.timeline,
                {
                  id: `t${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "user",
                  actorName: "You",
                  type: attachments.length > 0 ? "attachment" : "message",
                  content: text || `Attached ${attachments.length} file(s).`,
                  attachments,
                },
              ],
              attachments: [...c.attachments, ...attachments],
            }
      )
    );
  };

  const escalate = (id: string, reason: string) => {
    // TODO: POST /api/conflicts/:id/escalate
    setConflicts((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              status: "escalated",
              updatedAt: new Date().toISOString(),
              timeline: [
                ...c.timeline,
                {
                  id: `t${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "user",
                  actorName: "You",
                  type: "escalation",
                  content: `Escalation requested: ${reason}`,
                },
              ],
            }
      )
    );
  };

  const acceptResolution = (id: string) => {
    // TODO: PATCH /api/conflicts/:id/resolution/accept
    setConflicts((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              status: "resolved",
              resolutionStatus: "accepted",
              updatedAt: new Date().toISOString(),
              timeline: [
                ...c.timeline,
                {
                  id: `t${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "user",
                  actorName: "You",
                  type: "resolution_accepted",
                  content: "Resolution accepted by customer.",
                },
              ],
            }
      )
    );
  };

  const rejectResolution = (id: string, reason: string) => {
    // TODO: PATCH /api/conflicts/:id/resolution/reject
    setConflicts((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              resolutionStatus: "rejected",
              status: "investigating",
              updatedAt: new Date().toISOString(),
              timeline: [
                ...c.timeline,
                {
                  id: `t${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "user",
                  actorName: "You",
                  type: "resolution_rejected",
                  content: `Resolution rejected: ${reason}`,
                },
              ],
            }
      )
    );
  };

  const rateResolution = (id: string, rating: number, comment: string) => {
    // TODO: POST /api/conflicts/:id/satisfaction
    setConflicts((prev) =>
      prev.map((c) =>
        c.id !== id ? c : { ...c, satisfactionRating: rating, satisfactionComment: comment }
      )
    );
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {selectedConflict && (
        <ReportDetail
          conflict={selectedConflict}
          onClose={() => setSelectedId(null)}
          onAddMessage={addMessage}
          onEscalate={escalate}
          onAcceptResolution={acceptResolution}
          onRejectResolution={rejectResolution}
          onRateResolution={rateResolution}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Resolution Hub</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Report and resolve disputes across all NextBit services. Our dedicated team ensures fair and timely resolution for all conflicts.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <CardTitle>Report Issue</CardTitle>
              <CardDescription>Submit a new conflict report for immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowForm(true)} className="w-full">
                File New Report
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Phone className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <CardTitle>Call Support</CardTitle>
              <CardDescription>Speak directly with our conflict resolution specialists</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">+254 700 123 456</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Mail className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <CardTitle>Email Support</CardTitle>
              <CardDescription>Send detailed information via email for complex cases</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">conflicts@nextbit.co.ke</Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>File New Conflict Report</CardTitle>
              <CardDescription>
                All reports are handled confidentially. An SLA timer starts immediately on submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conflict Type</label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select conflict type" /></SelectTrigger>
                      <SelectContent>
                        {conflictTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v as Priority })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low — General inquiry (72h SLA)</SelectItem>
                        <SelectItem value="medium">Medium — Service disruption (24h SLA)</SelectItem>
                        <SelectItem value="high">High — Financial impact (4h SLA)</SelectItem>
                        <SelectItem value="urgent">Urgent — Critical issue (2h SLA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference linking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
                    <Select
                      value={formData.referenceType}
                      onValueChange={(v) => setFormData({ ...formData, referenceType: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Link to a record (optional)" /></SelectTrigger>
                      <SelectContent>
                        {referenceTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
                    <Input
                      value={formData.referenceId}
                      onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                      placeholder="e.g. RPR-7821, INS-CLM-4432"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the conflict"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide complete details including dates, parties involved, and desired resolution"
                    rows={4}
                    required
                  />
                </div>

                {/* File attachments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evidence / Attachments
                  </label>
                  <div
                    className="border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      Click to attach receipts, photos, invoices, or documents
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFormFileChange}
                  />
                  {formFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                          <FileText className="h-3.5 w-3.5 text-gray-400" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="text-gray-400">{formatBytes(f.size)}</span>
                          <button onClick={() => setFormFiles((prev) => prev.filter((_, j) => j !== i))}>
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="submit">Submit Report</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reports list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Your Conflict Reports</CardTitle>
                <CardDescription>Track status, view timelines, and respond to your cases.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-8 w-48 text-sm"
                    placeholder="Search by ID or title"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Status filter */}
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as Status | "all")}
                >
                  <SelectTrigger className="w-36 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                {/* Priority filter */}
                <Select
                  value={filterPriority}
                  onValueChange={(v) => setFilterPriority(v as Priority | "all")}
                >
                  <SelectTrigger className="w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No conflict reports match your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                    onClick={() => setSelectedId(conflict.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={conflict.status} />
                        <div>
                          <h3 className="font-semibold text-base">{conflict.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{conflict.id}</span>
                            {conflict.referenceId && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{conflict.referenceId}</span>
                              </>
                            )}
                            {conflict.assignedAgent && (
                              <>
                                <span>·</span>
                                <User className="h-3 w-3" />
                                <span>{conflict.assignedAgent}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Badge className={priorityColors[conflict.priority]}>
                          {conflict.priority.toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[conflict.status]}>
                          {conflict.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{conflict.description}</p>

                    {/* SLA bar inline */}
                    {conflict.slaDeadline && conflict.status !== "resolved" && (
                      <SlaTimer deadline={conflict.slaDeadline} priority={conflict.priority} />
                    )}

                    {/* Satisfaction stars if resolved and rated */}
                    {conflict.status === "resolved" && conflict.satisfactionRating && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3.5 w-3.5 ${
                              n <= conflict.satisfactionRating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">Rated</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Created {new Date(conflict.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {conflict.attachments.length > 0 && (
                          <><Paperclip className="h-3 w-3" /> {conflict.attachments.length}</>
                        )}
                        <span className="ml-2">Updated {new Date(conflict.updatedAt).toLocaleDateString()}</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process steps */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How We Resolve Conflicts</CardTitle>
            <CardDescription>Our systematic approach ensures fair and efficient resolution of all disputes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { n: 1, color: "bg-blue-100 text-blue-600", title: "Report Submission", body: "Submit your conflict report with all relevant details, evidence, and reference IDs." },
                { n: 2, color: "bg-yellow-100 text-yellow-600", title: "Initial Review", body: "Our team reviews the case within SLA and gathers information from all parties." },
                { n: 3, color: "bg-orange-100 text-orange-600", title: "Investigation", body: "Detailed investigation with evidence collection and expert consultation." },
                { n: 4, color: "bg-green-100 text-green-600", title: "Resolution", body: "Fair resolution proposed. You accept or reject — full control stays with you." },
              ].map(({ n, color, title, body }) => (
                <div key={n} className="text-center">
                  <div className={`${color} rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3`}>
                    <span className="font-bold">{n}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-gray-600">{body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}