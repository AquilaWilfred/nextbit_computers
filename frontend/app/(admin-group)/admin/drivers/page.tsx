"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Check, X, Truck, Circle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  id: number;
  name: string;
  status: "available" | "busy" | "offline";
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  busy:      "bg-amber-100 text-amber-700",
  offline:   "bg-slate-100 text-slate-500",
};

// ─── apiFetch helper ──────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName]   = useState("");
  const [editStatus, setEditStatus] = useState<Agent["status"]>("available");
  const [newName, setNewName]     = useState("");
  const [showAdd, setShowAdd]     = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await apiFetch<Agent[]>("/api/delivery/agents");
      setAgents(data);
    } catch (e: any) {
      toast.error(`Failed to load agents: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await apiFetch("/api/delivery/agents", {
        method: "POST",
        body: JSON.stringify({ id: 0, name: newName.trim(), status: "available" }),
      });
      toast.success("Agent added");
      setNewName("");
      setShowAdd(false);
      fetchAgents();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await apiFetch(`/api/delivery/agents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ id, name: editName, status: editStatus }),
      });
      toast.success("Agent updated");
      setEditingId(null);
      fetchAgents();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this agent?")) return;
    try {
      await apiFetch(`/api/delivery/agents/${id}`, { method: "DELETE" });
      toast.success("Agent deleted");
      fetchAgents();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.status.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    available: agents.filter(a => a.status === "available").length,
    busy:      agents.filter(a => a.status === "busy").length,
    offline:   agents.filter(a => a.status === "offline").length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-[var(--brand)]" /> Delivery Agents
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your delivery fleet
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Agent
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {(["available", "busy", "offline"] as const).map(status => (
            <Card key={status} className="p-4 flex items-center gap-3">
              <Circle className={`w-3 h-3 fill-current ${
                status === "available" ? "text-emerald-500" :
                status === "busy"      ? "text-amber-500" : "text-slate-400"
              }`} />
              <div>
                <p className="text-2xl font-bold">{counts[status]}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Add agent form */}
        {showAdd && (
          <Card className="p-4 border-[var(--brand)] border-2">
            <p className="text-sm font-semibold mb-3">New Agent</p>
            <div className="flex gap-2">
              <Input
                placeholder="Agent name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                autoFocus
              />
              <Button onClick={handleAdd} size="sm">
                <Check className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Agent list */}
        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading agents...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No agents match your search." : "No agents yet. Add one above."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-4">
                  {editingId === agent.id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="max-w-[200px]"
                        autoFocus
                      />
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as Agent["status"])}
                        className="border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                      >
                        <option value="available">Available</option>
                        <option value="busy">Busy</option>
                        <option value="offline">Offline</option>
                      </select>
                      <Button size="sm" onClick={() => handleUpdate(agent.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">ID #{agent.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${STATUS_COLORS[agent.status]} border-0 capitalize`}>
                          {agent.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(agent.id);
                            setEditName(agent.name);
                            setEditStatus(agent.status);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(agent.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}