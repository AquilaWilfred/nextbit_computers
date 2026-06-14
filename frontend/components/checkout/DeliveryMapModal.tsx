"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, CheckCircle2, Compass, Layers, Locate, MapPin,
  ChevronRight, Loader2, AlertTriangle, X, Search
} from "lucide-react";
import { useLeaflet } from "@/hooks/map/useLeaflet";
import { useDeliveryPin, DeliveryPin } from "@/hooks/checkout/useDeliveryPin";
import { DEFAULT_CENTER } from "@/lib/const";
import { cn } from "@/lib/utils";

interface DeliveryMapModalProps {
  open: boolean;
  initial?: DeliveryPin | null;
  onConfirm: (pin: DeliveryPin) => void;
  onClose: () => void;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

/** Haversine distance in km */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SOFT_LOCK_KM = 50;

export function DeliveryMapModal({ open, initial, onConfirm, onClose }: DeliveryMapModalProps) {
  const { L, loading: leafletLoading } = useLeaflet();
  const { pin, setPin, resolving, locating, onMapMoveEnd, locateMe } = useDeliveryPin();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const originRef = useRef<{ lat: number; lng: number } | null>(null);
  const clickMarkerRef = useRef<any>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [tooFar, setTooFar] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Init map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !L || !mapContainer.current || mapRef.current) return;

    const startCenter: [number, number] = initial
      ? [initial.lat, initial.lng]
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
    const startZoom = initial ? 15 : 5;

    const map = L.map(mapContainer.current, {
      center: startCenter,
      zoom: startZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);

    L.control.attribution({ position: "bottomleft", prefix: false })
      .addTo(map)
      .setPrefix('<span style="font-size:9px;opacity:0.4">© CARTO · OSM</span>');

    if (initial) {
      setPin(initial);
      originRef.current = { lat: initial.lat, lng: initial.lng };
    } else {
      const c = map.getCenter();
      onMapMoveEnd(c.lat, c.lng);
    }

    // moveend → reverse geocode + soft lock check
    const onMoveEnd = () => {
      const c = map.getCenter();
      onMapMoveEnd(c.lat, c.lng);
      if (originRef.current) {
        const dist = distanceKm(originRef.current.lat, originRef.current.lng, c.lat, c.lng);
        setTooFar(dist > SOFT_LOCK_KM);
        if (dist > SOFT_LOCK_KM) setWarningDismissed(false);
      }
      map.getContainer().classList.remove("map-interacting");
    };
    map.on("moveend", onMoveEnd);

    const onMoveStart = () => {
      map.getContainer().classList.add("map-interacting");
    };
    map.on("movestart", onMoveStart);
    map.on("zoomstart", onMoveStart);

    // ── Click to move pin ──────────────────────────────────────────────
    // When the user clicks, we fly the map so the clicked point becomes
    // the new center (which is where our fixed crosshair pin lives).
    map.on("click", (e: any) => {
      map.flyTo([e.latlng.lat, e.latlng.lng], Math.max(map.getZoom(), 15), {
        duration: 0.6,
      });
    });

    mapRef.current = map;

    // Auto-geolocate
    if (!initial && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          originRef.current = { lat, lng };
          mapRef.current?.flyTo([lat, lng], 14, { duration: 1.5 });
          onMapMoveEnd(lat, lng);
        },
        () => {
          const c = mapRef.current?.getCenter();
          if (c) originRef.current = { lat: c.lat, lng: c.lng };
        },
        { timeout: 6000 }
      );
    }

    return () => {
      map.off("moveend", onMoveEnd);
      map.off("movestart", onMoveStart);
      map.off("zoomstart", onMoveStart);
      map.off("click");
      map.remove();
      mapRef.current = null;
      originRef.current = null;
      clickMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, L]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 150);
    return () => clearTimeout(id);
  }, [open]);

  // ── Search — Nominatim (free, no key needed) ──────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      // Bias results toward the user's current origin
      const origin = originRef.current;
      const viewbox = origin
        ? `&viewbox=${origin.lng - 1},${origin.lat + 1},${origin.lng + 1},${origin.lat - 1}&bounded=0`
        : "";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}${viewbox}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSearchOpen(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(q), 350);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    mapRef.current?.flyTo([lat, lng], 16, { duration: 1 });
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","));
    setSearchResults([]);
    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    searchInputRef.current?.focus();
  };

  // ── Locate me ─────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(async () => {
    const coords = await locateMe();
    if (coords && mapRef.current) {
      originRef.current = { lat: coords.lat, lng: coords.lng };
      setTooFar(false);
      mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
    }
  }, [locateMe]);

  const handleSnapBack = useCallback(() => {
    if (originRef.current && mapRef.current) {
      mapRef.current.flyTo([originRef.current.lat, originRef.current.lng], 14, { duration: 1.2 });
      setTooFar(false);
      setWarningDismissed(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pin) return;
    onConfirm(pin);
    onClose();
  }, [pin, onConfirm, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const showWarning = tooFar && !warningDismissed;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-x-4 bottom-4 top-[72px] flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/30">

        {/* ── Top bar ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-2.5">
          <button
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-semibold">Delivery Location</p>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Search, click the map, or drag to pin your drop-off point.
            </p>
          </div>

          {resolving ? (
            <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Resolving…</span>
            </div>
          ) : (
            <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{pin ? "Ready" : "Waiting"}</span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Map column ── */}
          <div className="relative flex-1 min-w-0 bg-slate-900">
            {leafletLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading map…
              </div>
            ) : (
              <>
                <div ref={mapContainer} className="absolute inset-0 cursor-pointer" />
                <style jsx global>{`
                  .leaflet-container { cursor: pointer !important; }
                  .leaflet-container.map-interacting,
                  .leaflet-container.leaflet-dragging { cursor: grabbing !important; }
                `}</style>
              </>
            )}

            {/* Crosshair pin — above tile layer */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 1000 }}
            >
              <div className={cn(
                "absolute rounded-full bg-black/50 blur-2xl transition-all duration-300",
                resolving ? "h-8 w-8 opacity-25" : "h-14 w-14 opacity-20"
              )} />
              <div className={cn(
                "flex flex-col items-center transition-transform duration-300 ease-out",
                resolving ? "-translate-y-5" : "-translate-y-1"
              )}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[var(--brand)] shadow-[0_8px_32px_rgba(99,102,241,0.5)]">
                  <MapPin className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="mt-1.5 h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
              </div>
            </div>

            {/* ── Search bar — top center of map ── */}
            <div
              className="absolute left-1/2 top-3 -translate-x-1/2 w-full max-w-sm px-3"
              style={{ zIndex: 1200 }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length > 1 && setSearchOpen(true)}
                  placeholder="Search for a place…"
                  className="h-10 w-full rounded-2xl border border-border bg-background/95 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground shadow-lg backdrop-blur-md outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {searchLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <X className="h-4 w-4" />
                    }
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {searchOpen && searchResults.length > 0 && (
                <ul className="mt-1.5 overflow-hidden rounded-2xl border border-border bg-background/98 shadow-2xl backdrop-blur-md">
                  {searchResults.map((r, i) => {
                    const [primary, ...rest] = r.display_name.split(",");
                    return (
                      <li key={r.place_id}>
                        <button
                          type="button"
                          onClick={() => handleSelectResult(r)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-muted",
                            i !== 0 && "border-t border-border"
                          )}
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-foreground truncate">{primary}</span>
                            <span className="block text-[11px] text-muted-foreground truncate">{rest.join(",").trim()}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {searchOpen && !searchLoading && searchQuery.length > 1 && searchResults.length === 0 && (
                <div className="mt-1.5 rounded-2xl border border-border bg-background/98 px-4 py-3 text-xs text-muted-foreground shadow-xl backdrop-blur-md">
                  No places found for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Click-to-place hint — bottom left of map, fades after first use */}
            {!pin && (
              <div
                className="absolute bottom-4 left-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px] text-white/80 backdrop-blur-md"
                style={{ zIndex: 1100 }}
              >
                Tap anywhere on the map to place your pin
              </div>
            )}

            {/* Floating controls — left side */}
            <div className="absolute left-3 flex flex-col gap-2" style={{ zIndex: 1100, top: "3.5rem" }}>
              <button
                onClick={handleLocateMe}
                disabled={locating}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-background/95 text-[var(--brand)] shadow-lg backdrop-blur-md transition hover:border-[var(--brand)]",
                  locating && "cursor-wait opacity-60"
                )}
                aria-label="Use my location"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => pin && mapRef.current?.flyTo([pin.lat, pin.lng], 15, { duration: 1 })}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-background/95 text-foreground shadow-lg backdrop-blur-md transition hover:border-[var(--brand)]"
                aria-label="Re-center on pin"
              >
                <Compass className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-background/95 font-bold text-foreground shadow-lg backdrop-blur-md transition hover:border-[var(--brand)]"
                aria-label="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-background/95 font-bold text-foreground shadow-lg backdrop-blur-md transition hover:border-[var(--brand)]"
                aria-label="Zoom out"
              >
                −
              </button>
            </div>

            {/* Soft-lock warning */}
            {showWarning && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/80 dark:border-amber-800 px-4 py-3 shadow-xl"
                style={{ zIndex: 1100, maxWidth: "calc(100% - 32px)", width: "max-content" }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">You're far from your area</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">Delivery may not be available here.</p>
                </div>
                <button onClick={handleSnapBack} className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-amber-700">
                  Back to my area
                </button>
                <button onClick={() => setWarningDismissed(true)} className="shrink-0 text-amber-500 hover:text-amber-700 transition" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="flex w-[300px] shrink-0 flex-col border-l border-border bg-background lg:w-[320px]">

            <div className="shrink-0 border-b border-border px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected delivery point</p>
              <p className="mt-1.5 text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {pin?.address ?? "Move the map to set your pin"}
              </p>
              {pin && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {[pin.city, pin.county, pin.country, pin.postalCode].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                pin ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              )}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {pin ? "Ready to confirm" : "Waiting for pin"}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {[
                {
                  icon: <Search className="h-4 w-4 text-[var(--brand)] shrink-0" />,
                  title: "Search a place",
                  body: "Type in the search bar above the map to jump to any street, landmark, or area.",
                },
                {
                  icon: <MapPin className="h-4 w-4 text-[var(--brand)] shrink-0" />,
                  title: "Click to place",
                  body: "Tap anywhere on the map to instantly move the pin to that spot.",
                },
                {
                  icon: <Layers className="h-4 w-4 text-[var(--brand)] shrink-0" />,
                  title: "Drag to fine-tune",
                  body: "Drag the map to nudge the pin to the exact drop-off point.",
                },
                {
                  icon: <Locate className="h-4 w-4 text-[var(--brand)] shrink-0" />,
                  title: "Stay in your area",
                  body: `A warning appears if you navigate more than ${SOFT_LOCK_KM} km from your location.`,
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">{icon}{title}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 flex flex-col gap-2">
              <Button
                onClick={handleConfirm}
                disabled={!pin || resolving}
                className="h-10 w-full rounded-2xl bg-[var(--brand)] text-white hover:opacity-90 disabled:opacity-40 text-sm"
              >
                Confirm location
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                className="h-9 w-full rounded-2xl border border-border bg-background text-foreground hover:bg-muted text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}