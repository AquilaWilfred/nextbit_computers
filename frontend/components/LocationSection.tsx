// components/LocationSection.tsx
"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, ArrowRight, RefreshCw, X } from "lucide-react";
import { Branch, MapHandle } from "@/types/home.types";
import { getBranchStatusToday, formatPrice } from "@/lib/utils/homeHelpers";

interface LocationSectionProps {
  branches?: Branch[];
  filteredBranches: Branch[];
  selectedBranch: Branch | null;
  onSelectBranch: (branch: Branch) => void;
  onMarkerClick: (id: number) => void;
  mapRef: RefObject<MapHandle | null>;
  mapCenter: { lat: number; lng: number };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | "open" | "closed";
  onStatusFilterChange: (filter: "all" | "open" | "closed") => void;
  MapComponent: React.ComponentType<any>;
}

export function LocationSection({
  branches,
  filteredBranches,
  selectedBranch,
  onSelectBranch,
  onMarkerClick,
  mapRef,
  mapCenter,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  MapComponent,
}: LocationSectionProps) {
  const markers = (branches ?? []).map((b) => ({
    id: b.id,
    lat: Number(b.lat),
    lng: Number(b.lng),
    title: b.name,
    isMain: b.isMain,
  }));

  return (
    <section className="py-16 bg-muted/30 border-t border-border" aria-labelledby="locations-heading">
      <div className="container">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-[var(--brand)] mb-1">Come visit us</p>
          <h2 id="locations-heading" className="font-display text-2xl sm:text-3xl font-bold">
            {branches && branches.length > 1 ? "Our Branch Locations" : "Our Store Location"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {branches && branches.length > 1
              ? `${branches.length} locations across the region`
              : "Set your address in Admin → Settings → General"}
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] gap-8 items-start">
          {/* Left Column - Branch List */}
          <div className="space-y-4">
            {/* Selected Branch Card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Nearest branch</p>
              <h3 className="mt-2 text-xl font-semibold">{selectedBranch?.name ?? "Select a branch"}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedBranch?.address ?? "Choose a branch from the list below."}</p>
              {selectedBranch && (
                <div className="mt-4 text-sm text-muted-foreground space-y-2">
                  <p><span className="font-semibold">Status:</span> {getBranchStatusToday(selectedBranch) === "open" ? "Open now" : "Closed today"}</p>
                  {selectedBranch.phone && <p><span className="font-semibold">Phone:</span> {selectedBranch.phone}</p>}
                </div>
              )}
            </div>

            {/* Filter + Search */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter branches by status">
                  {(["all", "open", "closed"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onStatusFilterChange(option)}
                      aria-pressed={statusFilter === option}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        statusFilter === option ? "bg-[var(--brand)] text-white" : "bg-muted/10 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {option === "all" ? "All" : option === "open" ? "Open" : "Closed"}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {filteredBranches.length} of {branches?.length ?? 0}
                </span>
              </div>
              
              <div className="relative mt-4">
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search branches"
                  aria-label="Search branches"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--brand)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Branch List */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-sm">Branch list</h3>
                <span className="text-xs text-muted-foreground" aria-live="polite">{filteredBranches.length} shown</span>
              </div>
              
              {filteredBranches.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground text-center">
                  No branches match this filter.
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredBranches.map((branch) => {
                    const isSelected = branch.id === selectedBranch?.id;
                    return (
                      <li key={branch.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectBranch(branch)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectBranch(branch); } }}
                          aria-pressed={isSelected}
                          className={`w-full text-left rounded-2xl border p-4 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                            isSelected ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm" : "border-border bg-background hover:border-[var(--brand)]/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm">{branch.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{branch.address}</p>
                            </div>
                            {branch.isMain && (
                              <span className="text-[10px] rounded-full bg-[var(--brand)]/10 px-2 py-1 font-semibold text-[var(--brand)]">Main</span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[var(--brand)]" />
                              <span>{getBranchStatusToday(branch) === "open" ? "Open now" : "Closed"}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg">
              {branches === undefined ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <MapComponent
                  ref={mapRef}
                  className="h-[560px]"
                  initialCenter={mapCenter}
                  initialZoom={selectedBranch ? 14 : 10}
                  markers={markers}
                  selectedMarkerId={selectedBranch?.id}
                  onMarkerClick={onMarkerClick}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch?.lat && selectedBranch?.lng) {
                    mapRef.current?.flyTo(Number(selectedBranch.lat), Number(selectedBranch.lng), 14);
                  }
                }}
                aria-label="Recenter map"
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white border border-border px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Recenter
              </button>
            </div>

            {/* Opening Hours */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[var(--brand)]" />
                <h3 className="font-display font-semibold text-lg">Opening Hours</h3>
              </div>
              {selectedBranch ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-[15px]">{selectedBranch.name}</p>
                  {selectedBranch.hours?.length ? (
                    <dl>
                      {selectedBranch.hours.map((hour, idx) => (
                        <div key={idx} className="flex justify-between border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
                          <dt>{hour.label}</dt>
                          <dd className={hour.value.toLowerCase().includes("closed") ? "text-[var(--brand)]" : "font-medium"}>
                            {hour.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>Opening hours are not available for this branch.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a branch to view its opening hours and location.</p>
              )}
              
              <div className="border-t border-border pt-6 mt-6">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBranch?.address || "Nairobi, Kenya")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full gap-2 hover:bg-[var(--brand)] hover:text-white transition-colors">
                    Get Directions <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}