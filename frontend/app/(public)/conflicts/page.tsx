"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle, Clock, MessageSquare, Phone, Mail,
  Paperclip, ChevronDown, Search, Filter, ArrowUpCircle,
  Star, User, ThumbsUp, ThumbsDown, FileText, X, Send,
  Download, ExternalLink, Wrench, Shield, RefreshCw, Package, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/useAuth";

// ─────────────────────────────────────────────
// TYPES (match backend schemas)
// ─────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "pending" | "investigating" | "resolved" | "escalated";

interface Attachment {
  name: string;
  size: number;
  type: string;
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
  id: number;
  reference_number: string;
  type: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  created_at: string;
  updated_at: string;
  reference_id?: string;
  reference_type?: string;
  assigned_agent_name?: string;
  sla_deadline?: string;
  resolution?: string;
  resolution_status?: "pending_acceptance" | "accepted" | "rejected";
  satisfaction_rating?: number;
  satisfaction_comment?: string;
  attachments: Attachment[];
  timeline: TimelineEvent[];
}

// Helper to convert backend format to frontend format
function mapConflict(conflict: any): ConflictReport {
  return {
    id: conflict.id,
    reference_number: conflict.reference_number,
    type: conflict.type,
    title: conflict.title,
    description: conflict.description,
    status: conflict.status,
    priority: conflict.priority,
    created_at: conflict.created_at,
    updated_at: conflict.updated_at,
    reference_id: conflict.reference_id,
    reference_type: conflict.reference_type,
    assigned_agent_name: conflict.assigned_agent_name,
    sla_deadline: conflict.sla_deadline,
    resolution: conflict.resolution,
    resolution_status: conflict.resolution_status,
    satisfaction_rating: conflict.satisfaction_rating,
    satisfaction_comment: conflict.satisfaction_comment,
    attachments: conflict.attachments || [],
    timeline: conflict.timeline || [],
  };
}

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
// API SERVICE
// ─────────────────────────────────────────────

const API_BASE = "/api/conflicts";

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

function EntityPreviewCard({ referenceId, referenceType }: { referenceId: string; referenceType?: string }) {
  // This will be replaced with actual API call to fetch entity details
  // For now, show a placeholder
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600">Reference:</span>
        <span className="font-mono text-sm">{referenceId}</span>
        {referenceType && (
          <Badge variant="secondary" className="text-xs">
            {referenceType.replace(/_/g, " ")}
          </Badge>
        )}
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
  onRefresh,
}: {
  conflict: ConflictReport;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rating, setRating] = useState(conflict.satisfaction_rating ?? 0);
  const [ratingComment, setRatingComment] = useState(conflict.satisfaction_comment ?? "");
  const [ratingSubmitted, setRatingSubmitted] = useState(!!conflict.satisfaction_rating);
  const [loading, setLoading] = useState(false);
  const [localConflict, setLocalConflict] = useState(conflict);
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

  const sendMessage = async () => {
    if (!message.trim() && pendingFiles.length === 0) return;
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/${conflict.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: message, attachments: pendingFiles }),
      });
      toast.success("Message sent");
      setMessage("");
      setPendingFiles([]);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) {
      toast.error("Please provide a reason for escalation");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/${conflict.id}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason: escalateReason }),
      });
      toast.success("Case escalated successfully");
      setShowEscalateForm(false);
      setEscalateReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptResolution = async () => {
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/${conflict.id}/resolution/accept`, { method: "POST" });
      toast.success("Resolution accepted. Thank you!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept resolution");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectResolution = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/${conflict.id}/resolution/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast.success("Resolution rejected. Our team will investigate further.");
      setShowRejectForm(false);
      setRejectReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject resolution");
    } finally {
      setLoading(false);
    }
  };

  const handleRateResolution = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/${conflict.id}/satisfaction`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: ratingComment }),
      });
      toast.success("Thank you for your feedback!");
      setRatingSubmitted(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  // Update local conflict when props change
  useEffect(() => {
    setLocalConflict(conflict);
    setRating(conflict.satisfaction_rating ?? 0);
    setRatingComment(conflict.satisfaction_comment ?? "");
    setRatingSubmitted(!!conflict.satisfaction_rating);
  }, [conflict]);

  const isResolved = localConflict.status === "resolved";
  const isEscalated = localConflict.status === "escalated";
  const hasPendingResolution = localConflict.resolution_status === "pending_acceptance";

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
              <StatusIcon status={localConflict.status} />
              <span className="font-semibold text-lg">{localConflict.title}</span>
            </div>
            <p className="text-sm text-gray-500">{localConflict.reference_number}</p>
          </div>
          <div className="flex items-center gap-2">
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
              <Badge className={statusColors[localConflict.status]}>
                {localConflict.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Priority</p>
              <Badge className={priorityColors[localConflict.priority]}>
                {localConflict.priority.toUpperCase()}
              </Badge>
            </div>
            {localConflict.reference_id && (
              <div>
                <p className="text-gray-500 mb-1">Reference</p>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {localConflict.reference_id}
                </span>
              </div>
            )}
            {localConflict.assigned_agent_name && (
              <div>
                <p className="text-gray-500 mb-1">Assigned Agent</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>{localConflict.assigned_agent_name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Entity preview */}
          {localConflict.reference_id && (
            <EntityPreviewCard
              referenceId={localConflict.reference_id}
              referenceType={localConflict.reference_type}
            />
          )}

          {/* SLA */}
          {localConflict.sla_deadline && localConflict.status !== "resolved" && (
            <SlaTimer deadline={localConflict.sla_deadline} priority={localConflict.priority} />
          )}

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{localConflict.description}</p>
          </div>

          {/* Attachments */}
          {localConflict.attachments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
              <div className="space-y-2">
                {localConflict.attachments.map((att, i) => (
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
          {hasPendingResolution && localConflict.resolution && (
            <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
              <p className="font-semibold text-yellow-800 mb-1">Resolution Proposed</p>
              <p className="text-sm text-yellow-700 mb-3">{localConflict.resolution}</p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={handleAcceptResolution}
                  disabled={loading}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> Accept Resolution
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading}
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
                    onClick={handleRejectResolution}
                    disabled={loading}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Accepted resolution */}
          {localConflict.resolution_status === "accepted" && localConflict.resolution && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-1">Resolution Accepted</p>
              <p className="text-sm text-green-700">{localConflict.resolution}</p>
            </div>
          )}

          {/* Satisfaction rating */}
          {isResolved && (
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
                    disabled={rating === 0 || loading}
                    onClick={handleRateResolution}
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
              {localConflict.timeline.map((event) => (
                <div key={event.id} className="flex gap-3 pl-5 relative">
                  <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
                    <TimelineIcon type={event.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                      <span className={`font-medium ${event.actor === "agent" ? "text-blue-600" : event.actor === "system" ? "text-gray-400" : "text-gray-700"}`}>
                        {event.actorName}
                      </span>
                      <span>·</span>
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{event.content}</p>
                    {event.attachments && event.attachments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {event.attachments.map((a, i) => (
                          <span key={i} className="text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-500">
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escalate */}
          {!isResolved && !isEscalated && (
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
                    onClick={handleEscalate}
                    disabled={loading}
                  >
                    Confirm Escalation
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Reply composer */}
          {!isResolved && (
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
                <Button size="sm" onClick={sendMessage} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
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
  const { user, isAuthenticated } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    priority: "medium" as Priority,
    reference_id: "",
    reference_type: "",
  });
  const [formFiles, setFormFiles] = useState<Attachment[]>([]);

  const fetchConflicts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const url = `${API_BASE}?${params.toString()}`;
      const data = await apiFetch<any[]>(url);
      setConflicts(data.map(mapConflict));
    } catch (err: any) {
      toast.error(err.message || "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const selectedConflict = conflicts.find((c) => c.id === selectedId) ?? null;

  // Filters
  const filtered = conflicts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.reference_id ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchPriority = filterPriority === "all" || c.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // Form submit - Create new conflict
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) {
      toast.error("Please select a conflict type");
      return;
    }
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }
    if (!formData.description) {
      toast.error("Please enter a description");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        reference_id: formData.reference_id || undefined,
        reference_type: formData.reference_type || undefined,
        attachments: formFiles,
      };
      await apiFetch(API_BASE, { method: "POST", body: JSON.stringify(payload) });
      toast.success("Conflict report submitted successfully");
      setFormData({ type: "", title: "", description: "", priority: "medium", reference_id: "", reference_type: "" });
      setFormFiles([]);
      setShowForm(false);
      fetchConflicts();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setFormFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    ]);
  };

  const removeFormFile = (index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to view and manage your conflict reports.</p>
            <Button onClick={() => window.location.href = "/auth"}>Sign In</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Navbar />
      {selectedConflict && (
        <ReportDetail
          conflict={selectedConflict}
          onClose={() => setSelectedId(null)}
          onRefresh={fetchConflicts}
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

        {/* Report Form Modal */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conflict Type *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type (Optional)</label>
                    <Select
                      value={formData.reference_type}
                      onValueChange={(v) => setFormData({ ...formData, reference_type: v })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID (Optional)</label>
                    <Input
                      value={formData.reference_id}
                      onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                      placeholder="e.g. RPR-7821, INS-CLM-4432"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the conflict"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description *</label>
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
                    Evidence / Attachments (Optional)
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
                          <button type="button" onClick={() => removeFormFile(i)}>
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Report
                  </Button>
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
                <Button variant="ghost" size="sm" onClick={fetchConflicts} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading your reports...</p>
              </div>
            ) : filtered.length === 0 ? (
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
                            <span>{conflict.reference_number}</span>
                            {conflict.reference_id && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{conflict.reference_id}</span>
                              </>
                            )}
                            {conflict.assigned_agent_name && (
                              <>
                                <span>·</span>
                                <User className="h-3 w-3" />
                                <span>{conflict.assigned_agent_name}</span>
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
                    {conflict.sla_deadline && conflict.status !== "resolved" && (
                      <SlaTimer deadline={conflict.sla_deadline} priority={conflict.priority} />
                    )}

                    {/* Satisfaction stars if resolved and rated */}
                    {conflict.status === "resolved" && conflict.satisfaction_rating && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3.5 w-3.5 ${
                              n <= conflict.satisfaction_rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">Rated</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Created {new Date(conflict.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {conflict.attachments.length > 0 && (
                          <><Paperclip className="h-3 w-3" /> {conflict.attachments.length}</>
                        )}
                        <span className="ml-2">Updated {new Date(conflict.updated_at).toLocaleDateString()}</span>
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
      <Footer />
    </div>
  );
}