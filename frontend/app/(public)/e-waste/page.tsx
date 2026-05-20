"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/useAuth";
import { Loader2 } from "lucide-react";

// ─── Types (matching backend) ────────────────────────────────────────────────

type DeviceCategory = "laptop" | "desktop" | "monitor" | "printer" | "peripheral" | "other" | "battery" | "mobile_phone";
type ComplianceStandard = "NEMA" | "EU_WEEE" | "BASEL" | "ISO_14001" | "ROHS";
type TicketStatus = "surrendered" | "batched" | "collected" | "certified" | "exported" | "recycled";

interface SurrenderTicket {
  id: number;
  ticket_number: string;
  serial: string;
  brand: string;
  category: DeviceCategory;
  weight_kg: number;
  status: TicketStatus;
  points_awarded: number;
  nema_ref: string | null;
  weee_ref: string | null;
  basel_permit: string | null;
  co2_saved_kg: number;
  hazardous_materials: string[];
  recycler_name: string;
  recycler_certifications: string[];
  created_at: string;
  collected_at: string | null;
  certified_at: string | null;
  location: string;
  dropoff_branch: string;
}

interface RecyclingCenter {
  id: number;
  name: string;
  location: string;
  distance: number;
  certified: boolean;
  certifications: string[];
  accepts_categories: DeviceCategory[];
  operating_hours: string;
  phone: string;
  email: string;
  description: string;
  waste_types: string[];
  price_range?: string;
}

interface UserStats {
  total_tickets: number;
  total_points: number;
  total_co2_saved: number;
  total_weight_recycled: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_POINTS: Record<DeviceCategory, number> = {
  laptop: 500,
  desktop: 400,
  monitor: 300,
  printer: 250,
  peripheral: 100,
  other: 50,
  battery: 200,
  mobile_phone: 350,
};

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  laptop: "Laptop / Notebook",
  desktop: "Desktop / PC Tower",
  monitor: "Monitor / Display",
  printer: "Printer / Scanner",
  peripheral: "Keyboard, Mouse, Cables",
  other: "Other Electronics",
  battery: "Lithium Battery",
  mobile_phone: "Mobile Phone / Smartphone",
};

const CATEGORY_HAZARDOUS: Record<DeviceCategory, string[]> = {
  laptop: ["Lithium battery", "PCB", "Mercury lamp"],
  desktop: ["PCB", "Lead solder", "Capacitors"],
  monitor: ["Lead in CRT", "Mercury", "PCB"],
  printer: ["Toner dust", "Plastic", "Heavy metals"],
  peripheral: ["PVC", "Brominated flame retardants"],
  other: ["Mixed e-waste"],
  battery: ["Lithium", "Cobalt", "Nickel"],
  mobile_phone: ["Lithium battery", "Precious metals", "Brominated compounds"],
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  surrendered: "Received at Collection Point",
  batched: "Awaiting NEMA Batch Collection",
  collected: "Collected by Licensed Recycler",
  certified: "Compliance Certificate Issued",
  exported: "Exported (Basel Permit)",
  recycled: "Fully Recycled / Refurbished",
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  surrendered: "#EF9F27",
  batched: "#378ADD",
  collected: "#1D9E75",
  certified: "#639922",
  exported: "#8B5CF6",
  recycled: "#059669",
};

// ─── API Service ─────────────────────────────────────────────────────────────

const API_BASE = "/api/ewaste";

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EWasteDisposalPage() {
  const { user, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<SurrenderTicket[]>([]);
  const [recyclingCenters, setRecyclingCenters] = useState<RecyclingCenter[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCertModal, setShowCertModal] = useState<SurrenderTicket | null>(null);
  const [showCenterModal, setShowCenterModal] = useState<RecyclingCenter | null>(null);
  const [filterLocation, setFilterLocation] = useState("");

  // Form state
  const [serial, setSerial] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<DeviceCategory>("laptop");
  const [weightKg, setWeightKg] = useState("");
  const [nearestBranch, setNearestBranch] = useState("");
  const [location, setLocation] = useState("");
  const [agreeToCompliance, setAgreeToCompliance] = useState(false);

  const pointsPreview = CATEGORY_POINTS[category];

  // ── Fetch Functions ────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    try {
      const data = await apiFetch<SurrenderTicket[]>(`${API_BASE}/tickets`);
      setTickets(data);
    } catch (err: any) {
      console.error("Failed to load tickets", err);
    }
  }, []);

  const fetchCenters = useCallback(async () => {
    try {
      const data = await apiFetch<RecyclingCenter[]>(`${API_BASE}/centers`);
      setRecyclingCenters(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load recycling centers");
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const data = await apiFetch<UserStats>(`${API_BASE}/stats`);
      setUserStats(data);
    } catch (err: any) {
      console.error("Failed to load user stats", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTickets(), fetchCenters(), fetchUserStats()]);
    setLoading(false);
  }, [fetchTickets, fetchCenters, fetchUserStats]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllData]);

  // ── Create Ticket ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!serial.trim() || !brand.trim() || !weightKg || !nearestBranch.trim() || !location.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!agreeToCompliance) {
      toast.error("You must agree to the compliance and data handling terms.");
      return;
    }
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) {
      toast.error("Enter a valid weight in kilograms.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`${API_BASE}/tickets`, {
        method: "POST",
        body: JSON.stringify({
          serial: serial.trim(),
          brand: brand.trim(),
          category,
          weight_kg: w,
          location: location.trim(),
          dropoff_branch: nearestBranch.trim(),
        }),
      });
      toast.success(`Disposal ticket created! You'll earn ${pointsPreview} loyalty points after recycling confirmation.`);
      setShowForm(false);
      setSerial("");
      setBrand("");
      setWeightKg("");
      setNearestBranch("");
      setLocation("");
      setAgreeToCompliance(false);
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download Certificate ───────────────────────────────────────────────────

  const downloadCertificate = async (ticket: SurrenderTicket, standard: ComplianceStandard) => {
    try {
      // This would call a PDF generation endpoint
      // For now, just show a toast
      toast.success(`Downloading ${standard} compliance certificate for ticket ${ticket.ticket_number}`);
      // window.open(`/api/ewaste/certificates/${ticket.id}/download?standard=${standard}`, '_blank');
    } catch (err: any) {
      toast.error(err.message || "Failed to download certificate");
    }
  };

  // ── Center Actions ─────────────────────────────────────────────────────────

  const handleContactRecycler = (center: RecyclingCenter) => {
    navigator.clipboard.writeText(center.email);
    toast.success(`Email address copied: ${center.email}`);
  };

  const getDirections = (center: RecyclingCenter) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(center.location)}`, '_blank');
  };

  // ── Derived Values ─────────────────────────────────────────────────────────

  const totalPointsEarned = userStats?.total_points || 0;
  const totalCO2Saved = userStats?.total_co2_saved || 0;
  const totalDevicesRecycled = userStats?.total_tickets || 0;

  const filteredCenters = recyclingCenters.filter(center =>
    (!filterLocation || center.location.toLowerCase().includes(filterLocation.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
            <div className="text-5xl mb-4">♻️</div>
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access the e-waste disposal service.</p>
            <button
              onClick={() => window.location.href = "/auth"}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-gray-500 mt-4">Loading your e-waste dashboard...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Compliance Badges */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold">🇰🇪 NEMA 2026 · EMCA</span>
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">🇪🇺 EU WEEE Compliant</span>
                <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold">🌍 Basel Convention</span>
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">ISO 14001</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">E-Waste Disposal · Global Compliance</h1>
              <p className="text-gray-500 max-w-3xl mt-2">
                Fully compliant with Kenyan (NEMA/EMCA) and international e-waste regulations including EU WEEE Directive,
                Basel Convention on transboundary movements, and ISO 14001 environmental management standards.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <span>♻️</span> + New disposal ticket
            </button>
          </div>

          {/* Global Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Devices recycled</div>
              <div className="text-2xl font-bold text-emerald-700">{totalDevicesRecycled}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Loyalty points earned</div>
              <div className="text-2xl font-bold text-emerald-600">{totalPointsEarned.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">CO₂ saved (kg)</div>
              <div className="text-2xl font-bold text-blue-600">{totalCO2Saved.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Hazardous material diverted</div>
              <div className="text-2xl font-bold text-purple-600">{(totalDevicesRecycled * 0.5).toFixed(1)} kg</div>
            </div>
          </div>

          {/* Compliance Info Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "NEMA / EMCA Kenya", sub: "Licensed collectors · Chain of custody", icon: "🇰🇪" },
              { label: "EU WEEE Directive", sub: "2012/19/EU compliant recycling", icon: "🇪🇺" },
              { label: "Basel Convention", sub: "Transboundary movement permits", icon: "🌍" },
              { label: "ISO 14001:2015", sub: "Environmental management certified", icon: "📜" },
            ].map((item) => (
              <div key={item.label} className="border-l-2 border-emerald-500 pl-3">
                <div className="text-sm font-semibold text-gray-800">{item.icon} {item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recycling Centers Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">🏭 NEMA & Internationally Licensed Recyclers</h2>
          <div className="mb-3 max-w-xs">
            <input
              type="text"
              placeholder="Filter by location..."
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCenters.map(center => (
              <div key={center.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{center.name}</h3>
                    <p className="text-sm text-gray-500">{center.location} • {center.distance} km</p>
                  </div>
                  {center.certified && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">✓ Certified</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {center.certifications.slice(0, 2).map(cert => (
                    <span key={cert} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{cert}</span>
                  ))}
                  {center.certifications.length > 2 && <span className="text-[10px] text-gray-400">+{center.certifications.length - 2}</span>}
                </div>
                <div className="mt-2 text-xs text-gray-400">🕒 {center.operating_hours}</div>
                <div className="mt-1 text-xs text-gray-400">📞 {center.phone}</div>
                <button
                  onClick={() => setShowCenterModal(center)}
                  className="mt-3 w-full text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg transition font-medium"
                >
                  View Details →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">Your Disposal Tickets & Certificates</h2>
          </div>
          {tickets.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm border border-dashed rounded-xl">
              No disposal tickets yet. Submit your first ticket above.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-gray-800">{t.brand} · {CATEGORY_LABELS[t.category]}</span>
                      <div className="text-xs text-gray-400 mt-1">Ticket: {t.ticket_number} | S/N: {t.serial} | {t.weight_kg} kg | 📍 {t.location}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      <span className="text-emerald-700 font-semibold text-sm mt-1">+{t.points_awarded} pts</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t">
                    {t.nema_ref && (
                      <button onClick={() => setShowCertModal(t)} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-emerald-100 transition">
                        🇰🇪 NEMA: {t.nema_ref}
                      </button>
                    )}
                    {t.weee_ref && (
                      <button onClick={() => setShowCertModal(t)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                        🇪🇺 WEEE: {t.weee_ref}
                      </button>
                    )}
                    {t.basel_permit && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">🌍 Basel: {t.basel_permit}</span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">🌱 CO₂: {t.co2_saved_kg}kg saved</span>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>📅 Submitted: {new Date(t.created_at).toLocaleDateString()}</span>
                    {t.certified_at && <span>✅ Certified: {new Date(t.certified_at).toLocaleDateString()}</span>}
                    {t.status === "certified" && (
                      <button onClick={() => setShowCertModal(t)} className="text-emerald-600 hover:text-emerald-700 font-medium">
                        View Certificate →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Surrender Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center sticky top-0">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Surrender E-Waste</h3>
                <p className="text-xs text-gray-500 mt-0.5">NEMA & International Compliance Required</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Serial number *</label>
                  <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="e.g. 3K3TBH2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Brand *</label>
                  <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Dell, HP, Samsung" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Device category *</label>
                  <select value={category} onChange={e => setCategory(e.target.value as DeviceCategory)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {(Object.keys(CATEGORY_LABELS) as DeviceCategory[]).map(k => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Weight (kg) *</label>
                  <input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="e.g. 1.8" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your location *</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City/Area" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Drop-off branch *</label>
                  <input value={nearestBranch} onChange={e => setNearestBranch(e.target.value)} placeholder="Nearest NextBit branch" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div className="text-sm">
                    <span className="font-semibold text-amber-800">Hazardous materials detected:</span>
                    <span className="text-amber-700 ml-2">{CATEGORY_HAZARDOUS[category].join(", ")}</span>
                    <p className="text-xs text-amber-600 mt-1">These materials will be processed according to NEMA and Basel Convention guidelines.</p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2">
                <span>🌱</span>
                <span>You will earn <strong>{pointsPreview} loyalty points</strong> after NEMA recycler confirms collection. Estimated CO₂ savings: <strong>{Math.round((parseFloat(weightKg) || 0) * 80)} kg</strong></span>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">📋 Compliance & Data Handling Agreement</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreeToCompliance} onChange={e => setAgreeToCompliance(e.target.checked)} className="mt-0.5" />
                    <span>I confirm that this device is being surrendered for responsible recycling in compliance with NEMA/EMCA (Kenya) and applicable international standards (EU WEEE, Basel Convention).</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreeToCompliance} onChange={e => setAgreeToCompliance(e.target.checked)} className="mt-0.5" />
                    <span>I authorize NextBit to perform secure data destruction and issue compliance certificates on my behalf.</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreeToCompliance} onChange={e => setAgreeToCompliance(e.target.checked)} className="mt-0.5" />
                    <span>I understand that cross-border recycling will be done only with Basel Convention permits where applicable.</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSubmit} disabled={submitting} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${submitting ? 'bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                  {submitting ? "Submitting…" : "Submit & Consent to Compliance"}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 bg-white py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-emerald-50 to-white">
              <h3 className="text-lg font-semibold text-gray-800">Compliance Certificate</h3>
              <p className="text-xs text-gray-500">Ticket: {showCertModal.ticket_number}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-center py-4 border-b">
                <div className="text-4xl mb-2">📜</div>
                <div className="font-bold text-gray-800">Certificate of Responsible Recycling</div>
                <div className="text-xs text-gray-500 mt-1">Issued under NEMA/EMCA & EU WEEE standards</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Device:</span><span className="font-medium">{showCertModal.brand} - {CATEGORY_LABELS[showCertModal.category]}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Serial:</span><span className="font-mono text-xs">{showCertModal.serial}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Weight:</span><span>{showCertModal.weight_kg} kg</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CO₂ Saved:</span><span>{showCertModal.co2_saved_kg} kg</span></div>
                {showCertModal.nema_ref && <div className="flex justify-between"><span className="text-gray-500">NEMA Ref:</span><span className="font-mono text-xs">{showCertModal.nema_ref}</span></div>}
                {showCertModal.weee_ref && <div className="flex justify-between"><span className="text-gray-500">WEEE Ref:</span><span className="font-mono text-xs">{showCertModal.weee_ref}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Recycler:</span><span>{showCertModal.recycler_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Certifications:</span><span>{showCertModal.recycler_certifications.join(", ")}</span></div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center text-xs text-gray-500 mt-2">
                This certificate verifies that the above e-waste has been disposed of in compliance with Kenyan and international environmental regulations.
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCertModal(null)} className="flex-1 border border-gray-300 bg-white py-2 rounded-lg text-sm">Close</button>
                <button onClick={() => downloadCertificate(showCertModal, "NEMA")} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm">Download PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recycling Center Detail Modal */}
      {showCenterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{showCenterModal.name}</h3>
                <p className="text-sm text-gray-500">{showCenterModal.location}</p>
              </div>
              <button onClick={() => setShowCenterModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                {showCenterModal.certifications.map(cert => (
                  <span key={cert} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{cert}</span>
                ))}
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">About</h4>
                <p className="text-sm text-gray-600">{showCenterModal.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">📞 Phone</span>
                  <span className="font-medium">{showCenterModal.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">✉️ Email</span>
                  <span className="font-medium text-xs">{showCenterModal.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block text-xs">🕒 Hours</span>
                  <span className="font-medium">{showCenterModal.operating_hours}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block text-xs">♻️ Accepted Waste</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {showCenterModal.waste_types.map(type => (
                      <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{type}</span>
                    ))}
                  </div>
                </div>
                {showCenterModal.price_range && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-xs">💰 Pricing</span>
                    <span className="text-sm">{showCenterModal.price_range}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button onClick={() => getDirections(showCenterModal)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                  Get Directions
                </button>
                <button onClick={() => handleContactRecycler(showCenterModal)} className="flex-1 border border-gray-300 bg-white py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}