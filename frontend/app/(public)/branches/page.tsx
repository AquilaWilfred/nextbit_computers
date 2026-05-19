"use client";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { MapPin, X, Star, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapView } from "@/components/map/MapView";
import { MapHandle } from "@/components/map/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BranchHour {
  label: string;
  value: string;
}

interface Branch {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  isMain?: boolean;
  hours?: BranchHour[];
}

// ---------------------------------------------------------------------------
// Helpers (unchanged logic)
// ---------------------------------------------------------------------------

const WEEK_DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function parseTimeString(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\./g, "");
  if (
    normalized.includes("24/7") ||
    normalized.includes("open 24") ||
    normalized.includes("all day")
  ) {
    return Number.MIN_SAFE_INTEGER;
  }
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3];
  if (period) {
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  }
  return hour * 60 + minute;
}

function getBranchStatusToday(branch: Branch): "open" | "closed" {
  const today = WEEK_DAYS[new Date().getDay()];
  const schedule = branch.hours?.find(
    (h) => h.label?.toLowerCase() === today.toLowerCase()
  );
  const value = schedule?.value?.trim() ?? "";
  const normalized = value.toLowerCase();
  if (
    !normalized ||
    normalized.includes("closed") ||
    normalized.includes("holiday") ||
    normalized.includes("no service")
  )
    return "closed";
  if (
    normalized.includes("24") ||
    normalized.includes("open 24") ||
    normalized.includes("all day")
  )
    return "open";

  const parts = normalized.split(/\s*(?:-|to|–|—)\s*/);
  const start = parseTimeString(parts[0] ?? "");
  const end = parseTimeString(parts[1] ?? "");
  if (start === null || end === null) return "open";

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  if (start <= end) return nowMinutes >= start && nowMinutes <= end ? "open" : "closed";
  return nowMinutes >= start || nowMinutes <= end ? "open" : "closed";
}

// ---------------------------------------------------------------------------
// Hook — replaces trpc.branches.list.useQuery
// ---------------------------------------------------------------------------

const toCoord = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v as string) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useBranches() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load branches");
        return r.json();
      })
      .then((data: any[]) =>
        data.map(b => ({
          ...b,
          latitude:  toCoord(b.latitude),
          longitude: toCoord(b.longitude),
        }))
      )
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setIsLoading(false));
  }, []);

  return { branches, isLoading };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Branches() {
  const { branches, isLoading } = useBranches();
  const mapRef = useRef<MapHandle>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeTargetId, setRouteTargetId] = useState<number | null>(null);

  const selectedBranch = branches?.find((b) => b.id === selectedId) ?? null;

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    const query = searchQuery.trim().toLowerCase();
    return branches.filter((branch) => {
      const status = getBranchStatusToday(branch);
      if (statusFilter === "open" && status !== "open") return false;
      if (statusFilter === "closed" && status !== "closed") return false;
      if (!query) return true;
      return `${branch.name} ${branch.address ?? ""}`.toLowerCase().includes(query);
    });
  }, [branches, searchQuery, statusFilter]);

  // Clear selection when it falls outside filtered results
  useEffect(() => {
    if (selectedId && !filteredBranches.some((b) => b.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredBranches, selectedId]);

  // Auto-select first branch when list loads
  useEffect(() => {
    if (!selectedId && filteredBranches.length > 0) {
      setSelectedId(filteredBranches[0].id);
    }
  }, [filteredBranches, selectedId]);

  // Geolocation — find nearest branch
  useEffect(() => {
    if (geoAttempted || !branches?.length) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoAttempted(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let nearest = branches[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const branch of branches) {
          const lat = branch.latitude;
          const lng = branch.longitude;
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
          const dist = (latitude - lat) ** 2 + (longitude - lng) ** 2;
          if (dist < bestDist) { bestDist = dist; nearest = branch; }
        }
        if (nearest?.id != null) {
          setSelectedId(nearest.id);
          mapRef.current?.flyTo(nearest.latitude, nearest.longitude, 16);
        }
        setGeoAttempted(true);
      },
      () => setGeoAttempted(true),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 300_000 }
    );
  }, [branches, geoAttempted]);

  const handleSelectBranch = useCallback((b: Branch) => {
    setSelectedId(b.id);
    setRouteTargetId(null);
    mapRef.current?.clearRoute();
    mapRef.current?.flyTo(b.latitude, b.longitude, 16);
  }, []);

  const handleMarkerClick = useCallback((id: number) => {
    const branch =
      filteredBranches.find((b) => b.id === id) ||
      branches?.find((b) => b.id === id);
    if (!branch) return;
    setSelectedId(branch.id);
    mapRef.current?.clearRoute();
    mapRef.current?.flyTo(branch.latitude, branch.longitude, 16);
  }, [filteredBranches, branches]);

  const handleGetDirections = useCallback(async (b: Branch) => {
    setRouting(true);
    const origin = selectedBranch
      ? { lat: selectedBranch.latitude, lng: selectedBranch.longitude }
      : undefined;
    await mapRef.current?.showRouteTo(b.latitude, b.longitude, origin);
    setRouteTargetId(b.id);
    setRouting(false);
  }, [selectedBranch]);

  const markers = filteredBranches
  .filter(b => b.latitude !== 0 && b.longitude !== 0)  
  .map(b => ({
    id: b.id,
    lat: b.latitude,
    lng: b.longitude,
    title: b.name,
    isMain: b.isMain,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container pb-12">
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
            {/* ---- Sidebar ---- */}
            <aside className="min-w-0">
              <div className="mb-4">
                <h1 className="text-3xl font-bold font-display">Our Branches</h1>
                <p className="text-muted-foreground mt-1">
                  List shown on left, map on the right for best route access.
                </p>
                {selectedBranch && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Nearest detected branch:{" "}
                    <span className="font-semibold">{selectedBranch.name}</span>{" "}
                    — {selectedBranch.address}
                  </p>
                )}
              </div>

              {/* Filters */}
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(["all", "open", "closed"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors capitalize",
                        statusFilter === option
                          ? "bg-[var(--brand)] text-white"
                          : "bg-muted/10 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search branches or address"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-[var(--brand)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing {filteredBranches.length} of {branches?.length ?? 0} branches.
                </p>
              </div>

              {/* Branch list */}
              <div className="overflow-y-auto max-h-[calc(100vh-240px)] space-y-3 pt-2">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <Card key={i} className="p-4 h-32 animate-pulse bg-secondary" />
                  ))
                ) : !branches?.length ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No branch locations available yet.
                  </Card>
                ) : filteredBranches.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No branches match your filters.
                  </Card>
                ) : (
                  filteredBranches.map((b) => {
                    const isSelected = selectedId === b.id;
                    const status = getBranchStatusToday(b);
                    return (
                      <Card
                        key={b.id}
                        onClick={() => handleSelectBranch(b)}
                        className={cn(
                          "p-4 space-y-3 cursor-pointer transition-all duration-150 hover:shadow-md border-2",
                          isSelected
                            ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-md"
                            : "border-transparent hover:border-border"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm leading-tight">{b.name}</h3>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                status === "open"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {status === "open" ? "Open now" : "Closed today"}
                            </span>
                          </div>
                          {b.isMain && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-[var(--brand)]/10 text-[var(--brand)] px-2 py-0.5 rounded-full shrink-0">
                              <Star size={9} /> Main
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin size={12} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                          <span>{b.address}</span>
                        </div>

                        {isSelected && (b.hours?.length ?? 0) > 0 && (
                          <div className="border-t border-border pt-2.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                              <Clock size={11} /> Opening Hours
                            </div>
                            {b.hours!.map((h, i) => (
                              <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                                <span className="font-medium">{h.label}</span>
                                <span>{h.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedBranch && selectedBranch.id !== b.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGetDirections(b);
                            }}
                            disabled={routing}
                            className="w-full rounded-lg bg-[var(--brand)] text-xs font-semibold text-white py-2 mt-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            {routeTargetId === b.id
                              ? "Routing on map…"
                              : `Route from ${selectedBranch.name}`}
                          </button>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ---- Map section ---- */}
            <section className="min-w-0">
              {selectedBranch && (
                <Card className="mb-4 p-5 border border-border">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Selected branch
                      </p>
                      <h2 className="text-xl font-semibold">{selectedBranch.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{selectedBranch.address}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          getBranchStatusToday(selectedBranch) === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {getBranchStatusToday(selectedBranch) === "open"
                          ? "Open now"
                          : "Closed today"}
                      </span>
                      {selectedBranch.isMain && (
                        <span className="inline-flex items-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-1 text-xs font-semibold">
                          Main branch
                        </span>
                      )}
                    </div>
                  </div>

                  {(selectedBranch.hours?.length ?? 0) > 0 && (
                    <div className="mt-4 border-t border-border pt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold">Opening Hours</span>
                        <span className="text-sm font-bold text-red-600">{selectedBranch.name}</span>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        {selectedBranch.hours!.map((h, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{h.label}</span>
                            <span>{h.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {routeTargetId && (
                    <div className="mt-4 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/30 p-3 text-xs text-[var(--brand)]">
                      Active route: {selectedBranch.name} →{" "}
                      {filteredBranches.find((b) => b.id === routeTargetId)?.name || "destination"}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRouteTargetId(null);
                        mapRef.current?.clearRoute();
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      Clear route overlay
                    </button>
                  </div>
                </Card>
              )}

              <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                <MapView
                  ref={mapRef}
                  className="w-full h-[420px] lg:h-[600px]"
                  markers={markers}
                  selectedMarkerId={selectedId ?? undefined}
                  onMarkerClick={handleMarkerClick}
                  initialZoom={12}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}