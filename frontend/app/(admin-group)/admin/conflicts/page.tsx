"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle, Clock, MessageSquare, Search, Filter,
  ArrowUpCircle, Star, User, ThumbsUp, FileText, X, Send,
  Download, ExternalLink, Wrench, Shield, RefreshCw, Package,
  Users, Inbox, ChevronDown, Paperclip,
  Edit2, UserCheck, AlertTriangle, CheckSquare, Loader2,
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
  type:
    | "status_change"
    | "message"
    | "attachment"
    | "escalation"
    | "resolution_proposed"
    | "resolution_accepted"
    | "resolution_rejected"
    | "agent_assigned"
    | "sla_override";
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
  customer_name: string;
  customer_email: string;
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
    customer_name: conflict.customer_name,
    customer_email: conflict.customer_email,
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

// ─────────────────────────────────────────────
// AGENTS (from backend)
// ─────────────────────────────────────────────

const AGENTS = [
  { id: "gw", name: "Grace Wambui", department: "Repairs", avatar: "GW" },
  { id: "dm", name: "David Mwangi", department: "Insurance", avatar: "DM" },
  { id: "ma", name: "Mercy Atieno", department: "Trade-in", avatar: "MA" },
  { id: "jk", name: "James Kamau", department: "General", avatar: "JK" },
  { id: "fn", name: "Faith Njeri", department: "Escalations", avatar: "FN" },
];

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

const SLA_HOURS: Record<Priority, number> = { urgent: 2, high: 4, medium: 24, low: 72 };

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
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "status_change": return <Clock className={cls} />;
    case "message": return <MessageSquare className={cls} />;
    case "attachment": return <Paperclip className={cls} />;
    case "escalation": return <ArrowUpCircle className={`${cls} text-red-500`} />;
    case "resolution_proposed": return <AlertCircle className={`${cls} text-yellow-500`} />;
    case "resolution_accepted": return <CheckCircle className={`${cls} text-green-500`} />;
    case "resolution_rejected": return <X className={`${cls} text-red-500`} />;
    case "agent_assigned": return <UserCheck className={cls} />;
    case "sla_override": return <Edit2 className={cls} />;
    default: return <Clock className={cls} />;
  }
}

function SlaTimer({ deadline, priority }: { deadline: string; priority: Priority }) {
  const { label, urgent } = getTimeRemaining(deadline);
  const totalMs = SLA_HOURS[priority] * 3600000;
  const remainMs = Math.max(0, new Date(deadline).getTime() - Date.now());
  const pct = Math.round((remainMs / totalMs) * 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">SLA</span>
        <span className={urgent ? "text-red-600 font-medium" : "text-gray-600"}>{label}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${urgent ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AgentAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${dim} rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────

function StatsBar({ conflicts }: { conflicts: ConflictReport[] }) {
  const total = conflicts.length;
  const pending = conflicts.filter((c) => c.status === "pending").length;
  const escalated = conflicts.filter((c) => c.status === "escalated").length;
  const resolved = conflicts.filter((c) => c.status === "resolved").length;
  const breached = conflicts.filter(
    (c) => c.sla_deadline && c.status !== "resolved" && new Date(c.sla_deadline).getTime() < Date.now()
  ).length;
  const rated = conflicts.filter((c) => c.satisfaction_rating).map((c) => c.satisfaction_rating!);
  const avgRating = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : "—";

  const stats = [
    { label: "Total", value: total, icon: <Inbox className="h-4 w-4" />, color: "text-gray-700" },
    { label: "Pending", value: pending, icon: <Clock className="h-4 w-4" />, color: "text-gray-600" },
    { label: "Escalated", value: escalated, icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-red-600" },
    { label: "SLA Breached", value: breached, icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600" },
    { label: "Resolved", value: resolved, icon: <CheckSquare className="h-4 w-4" />, color: "text-green-600" },
    { label: "Avg Rating", value: avgRating, icon: <Star className="h-4 w-4" />, color: "text-yellow-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border rounded-lg px-4 py-3">
          <div className={`flex items-center gap-1.5 text-xs text-gray-500 mb-1`}>
            <span className={s.color}>{s.icon}</span>
            {s.label}
          </div>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN DETAIL PANEL
// ─────────────────────────────────────────────

function AdminDetailPanel({
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
  const [resolutionText, setResolutionText] = useState(conflict.resolution ?? "");
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [slaHoursInput, setSlaHoursInput] = useState("");
  const [showSlaForm, setShowSlaForm] = useState(false);
  const [status, setStatus] = useState<Status>(conflict.status);
  const [assignedAgent, setAssignedAgent] = useState(conflict.assigned_agent_name ?? "unassigned");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
  };

  const sendMessage = async () => {
    if (!message.trim() && pendingFiles.length === 0) return;
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/admin/${conflict.id}/messages`, {
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

  const handleStatusChange = async (newStatus: Status) => {
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/admin/${conflict.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
      toast.success(`Status changed to ${newStatus}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async (agentName: string) => {
    setLoading(true);
    const assignedAgentName = agentName === "unassigned" ? "" : agentName;
    try {
      await apiFetch(`${API_BASE}/admin/${conflict.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_agent_name: assignedAgentName }),
      });
      setAssignedAgent(agentName);
      toast.success(agentName === "unassigned" ? "Agent unassigned" : `Assigned to ${agentName}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign agent");
    } finally {
      setLoading(false);
    }
  };

  const handleProposeResolution = async () => {
    if (!resolutionText.trim()) {
      toast.error("Please enter a resolution");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/admin/${conflict.id}/resolution`, {
        method: "POST",
        body: JSON.stringify({ text: resolutionText }),
      });
      toast.success("Resolution proposed to customer");
      setShowResolutionForm(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to propose resolution");
    } finally {
      setLoading(false);
    }
  };

  const handleSlaOverride = async () => {
    const hours = parseInt(slaHoursInput);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Please enter valid hours");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`${API_BASE}/admin/${conflict.id}/sla-override`, {
        method: "POST",
        body: JSON.stringify({ hours }),
      });
      toast.success(`SLA deadline extended by ${hours} hours`);
      setShowSlaForm(false);
      setSlaHoursInput("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to override SLA");
    } finally {
      setLoading(false);
    }
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
              <StatusIcon status={status} />
              <span className="font-semibold text-lg">{conflict.title}</span>
            </div>
            <p className="text-sm text-gray-500">{conflict.reference_number} · {conflict.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Customer info */}
          <div className="border rounded-lg px-4 py-3 flex items-center gap-3">
            <AgentAvatar name={conflict.customer_name} size="md" />
            <div>
              <p className="font-medium text-sm">{conflict.customer_name}</p>
              <p className="text-xs text-gray-500">{conflict.customer_email}</p>
            </div>
          </div>

          {/* Admin controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status change */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Change Status</p>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as Status)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assign agent */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Assigned Agent</p>
              <Select value={assignedAgent} onValueChange={handleAssignAgent}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {AGENTS.map((a) => (
                    <SelectItem key={a.id} value={a.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-gray-400 text-xs">· {a.department}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Priority</p>
              <Badge className={priorityColors[conflict.priority]}>{conflict.priority.toUpperCase()}</Badge>
            </div>
            {conflict.reference_id && (
              <div>
                <p className="text-gray-500 mb-1">Reference</p>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{conflict.reference_id}</span>
              </div>
            )}
          </div>

          {/* SLA */}
          {conflict.sla_deadline && status !== "resolved" && (
            <div>
              <SlaTimer deadline={conflict.sla_deadline} priority={conflict.priority} />
              <button
                className="mt-2 text-xs text-blue-600 hover:underline"
                onClick={() => setShowSlaForm(!showSlaForm)}
              >
                Override SLA deadline
              </button>
              {showSlaForm && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Hours from now"
                    value={slaHoursInput}
                    onChange={(e) => setSlaHoursInput(e.target.value)}
                    className="w-40 text-sm"
                  />
                  <Button size="sm" onClick={handleSlaOverride} disabled={loading}>
                    Apply
                  </Button>
                </div>
              )}
            </div>
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

          {/* Satisfaction rating (read-only on admin side) */}
          {conflict.satisfaction_rating && (
            <div className="border rounded-lg px-4 py-3">
              <p className="text-sm font-medium mb-2">Customer Satisfaction</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-5 w-5 ${n <= conflict.satisfaction_rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                  />
                ))}
                <span className="text-sm text-gray-600 ml-1">{conflict.satisfaction_rating}/5</span>
              </div>
              {conflict.satisfaction_comment && (
                <p className="text-sm text-gray-500 mt-1 italic">"{conflict.satisfaction_comment}"</p>
              )}
            </div>
          )}

          {/* Propose resolution */}
          {status !== "resolved" && (
            <div className="border rounded-lg p-4">
              <button
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                onClick={() => setShowResolutionForm(!showResolutionForm)}
              >
                <ThumbsUp className="h-4 w-4" />
                Propose a resolution to customer
              </button>
              {showResolutionForm && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Describe the resolution you're proposing to the customer…"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleProposeResolution} disabled={loading}>
                    Send to Customer
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

          {/* Agent reply composer */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Post internal or customer-facing message</p>
            <Textarea
              placeholder="Write a message to the customer or log an internal note…"
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
              <button className="text-gray-400 hover:text-gray-600" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────

export default function AdminConflictsPage() {
  const { user, isAuthenticated } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConflicts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const url = `${API_BASE}/admin/all?${params.toString()}`;
      const data = await apiFetch<any[]>(url);
      setConflicts(data.map(mapConflict));
    } catch (err: any) {
      const message = err?.message || "Failed to load conflicts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    fetchConflicts();
    pollingRef.current = setInterval(fetchConflicts, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchConflicts]);

  const selectedConflict = conflicts.find((c) => c.id === selectedId) ?? null;

  const filtered = conflicts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.reference_id ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchPriority = filterPriority === "all" || c.priority === filterPriority;
    const matchAgent =
      filterAgent === "all" ||
      (filterAgent === "unassigned" ? !c.assigned_agent_name : c.assigned_agent_name === filterAgent);
    return matchSearch && matchStatus && matchPriority && matchAgent;
  });

  // Sort: urgent + escalated first, then by SLA deadline ascending
  const sorted = [...filtered].sort((a, b) => {
    const urgencyScore = (c: ConflictReport) =>
      c.status === "escalated" ? 0 : c.priority === "urgent" ? 1 : c.priority === "high" ? 2 : 3;
    const diff = urgencyScore(a) - urgencyScore(b);
    if (diff !== 0) return diff;
    return new Date(a.sla_deadline ?? "9999").getTime() - new Date(b.sla_deadline ?? "9999").getTime();
  });

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "agent")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin or agent privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedConflict && (
        <AdminDetailPanel
          conflict={selectedConflict}
          onClose={() => setSelectedId(null)}
          onRefresh={fetchConflicts}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conflict Triage</h1>
            <p className="text-gray-500 mt-1">Admin · Resolution Hub</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchConflicts} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Live · auto-refresh every 30s
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsBar conflicts={conflicts} />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Search by ID, customer, title, reference…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as Status | "all")}>
                <SelectTrigger className="w-40 text-sm">
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

              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as Priority | "all")}>
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

              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="w-44 text-sm">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {AGENTS.map((a) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-sm text-gray-400 ml-auto">{sorted.length} result{sorted.length !== 1 ? "s" : ""}</span>
            </div>
          </CardContent>
        </Card>

        {/* Triage table */}
        <Card>
          <CardContent className="p-0">
            {loading && conflicts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading conflicts...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p>{error}</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No conflicts match your filters.</p>
              </div>
            ) : (
              <div className="divide-y">
                {sorted.map((conflict) => {
                  const slaInfo = conflict.sla_deadline && conflict.status !== "resolved"
                    ? getTimeRemaining(conflict.sla_deadline)
                    : null;

                  return (
                    <div
                      key={conflict.id}
                      className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        conflict.status === "escalated" ? "border-l-4 border-l-red-500" :
                        conflict.priority === "urgent" ? "border-l-4 border-l-orange-400" :
                        "border-l-4 border-l-transparent"
                      }`}
                      onClick={() => setSelectedId(conflict.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div className="mt-0.5">
                          <StatusIcon status={conflict.status} />
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{conflict.title}</h3>
                                <span className="text-xs text-gray-400 font-mono">{conflict.reference_number}</span>
                                {conflict.reference_id && (
                                  <span className="text-xs text-blue-500 font-mono">{conflict.reference_id}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{conflict.description}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={priorityColors[conflict.priority]}>
                                {conflict.priority.toUpperCase()}
                              </Badge>
                              <Badge className={statusColors[conflict.status]}>
                                {conflict.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                            {/* Customer */}
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              <span>{conflict.customer_name}</span>
                            </div>

                            {/* Agent */}
                            {conflict.assigned_agent_name ? (
                              <div className="flex items-center gap-1.5">
                                <AgentAvatar name={conflict.assigned_agent_name} size="sm" />
                                <span>{conflict.assigned_agent_name}</span>
                              </div>
                            ) : (
                              <span className="text-orange-500 font-medium">⚠ Unassigned</span>
                            )}

                            {/* SLA */}
                            {slaInfo && (
                              <span className={slaInfo.urgent ? "text-red-600 font-medium" : "text-gray-500"}>
                                ⏱ {slaInfo.label}
                              </span>
                            )}

                            {/* Attachments */}
                            {conflict.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> {conflict.attachments.length}
                              </span>
                            )}

                            {/* Satisfaction */}
                            {conflict.satisfaction_rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                {conflict.satisfaction_rating}/5
                              </span>
                            )}

                            <span className="ml-auto">
                              Updated {new Date(conflict.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}