// app/(public)/repairs/RepairsClient.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wrench, ShieldCheck, Lock, Receipt, ArrowLeftRight, Search, Package, ClipboardList, History, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TechnicianCard } from "@/components/repairs/TechnicianCard";
import { PartsShop } from "@/components/repairs/PartsShop";
import { MyRequests } from "@/components/repairs/MyRequests";
import { RepairHistory } from "@/components/repairs/RepairHistory";
import { RequestFormModal } from "@/components/repairs/RequestFormModal";
import { TrustPill } from "@/components/repairs/TrustPill";
import { useTechnicians } from "@/hooks/technician_and_repairs/useTechnicians";
import { useParts } from "@/hooks/useParts";
import { useRepairRequests } from "@/hooks/technician_and_repairs/useRepairRequests";
import { useRepairHistory } from "@/hooks/technician_and_repairs/useRepairHistory";
import { ActiveTab, Technician } from "@/types/repairs.types";
import { useAuth } from "@/hooks/auth/useAuth";
import { useWebSocket } from "@/hooks/technician_and_repairs/useWebSocket";


const MOCK_REVIEWS = [
  { id: "r1", technicianId: "t1", reviewerName: "James M.", rating: 5, device: "Dell XPS 15", comment: "Excellent service!", date: "12 Apr 2025" },
];

export default function RepairsClient() {
  const { user } = useAuth();
  const userId = user?.id ?? null; // Get from auth context
  const [activeTab, setActiveTab] = useState<ActiveTab>("find");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Custom hooks
  const { isConnected } = useWebSocket(userId);
  const techniciansHook = useTechnicians(userId);
  const partsHook = useParts();
  const requestsHook = useRepairRequests(userId);
  const historyHook = useRepairHistory(userId);

  const handleContact = (tech: Technician) => {
    setSelectedTechnician(tech);
    setShowRequestForm(true);
    toast.info(`Preparing a quote request for ${tech.name}. Fill in your details and submit to notify nearby technicians.`);
  };

  const handleViewReviews = (tech: Technician) => {
    toast.info(`Showing reviews for ${tech.name}.`);
  };

  const handleSubmitRequest = async (data: any) => {
    const success = await requestsHook.createRequest(data);
    if (success) {
      setSelectedTechnician(null);
      setShowRequestForm(false);
      setActiveTab("requests");
    }
    return success;
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: "find", label: "Find technician", icon: <Search className="h-4 w-4" /> },
    { key: "parts", label: "Parts shop", icon: <Package className="h-4 w-4" /> },
    { key: "requests", label: "My requests", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "history", label: "History", icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Wrench className="h-7 w-7" /> Repair &amp; Parts Marketplace
          </h1>
          <p className="text-muted-foreground">
            Find IPRS-verified technicians, source genuine parts, and track every repair — all with payment protection.
          </p>
        </div>

        {/* Trust pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TrustPill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="IPRS Verified" />
          <TrustPill icon={<Lock className="h-3.5 w-3.5" />} label="Escrow payments" />
          <TrustPill icon={<Receipt className="h-3.5 w-3.5" />} label="Warranty covered" />
          <TrustPill icon={<ArrowLeftRight className="h-3.5 w-3.5" />} label="Dispute protection" />
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`${filtersOpen ? "block" : "hidden"} lg:block w-full lg:w-56 shrink-0 space-y-6`}>
            <div className="p-3 rounded-lg bg-card border">
              <h3 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wide">Browse</h3>
              <div className="flex flex-col gap-1">
                {tabs.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setFiltersOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      activeTab === key ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "find" && (
              <div className="p-3 rounded-lg bg-card border">
                <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wide">Filters</h3>
                
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={techniciansHook.searchQuery}
                    onChange={(e) => techniciansHook.setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background"
                  />
                </div>

                {/* Spec filter — vertical list, not pills */}
                <div className="flex flex-col gap-0.5">
                  {["all", "Laptop", "Desktop", "Screen", "Motherboard", "Phone", "Battery", "Keyboard", "RAM", "Storage"].map((spec) => (
                    <button
                      key={spec}
                      onClick={() => techniciansHook.setActiveSpec(spec)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        techniciansHook.activeSpec === spec
                          ? "bg-emerald-600/10 text-emerald-600 font-semibold"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {spec === "all" ? "All specialisms" : spec}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/*  show WebSocket status */}
            {requestsHook && (
              <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Live updates active
              </div>
            )}

            {/* Mobile filter button */}
            <Button variant="outline" size="sm" className="lg:hidden mb-4" onClick={() => setFiltersOpen(!filtersOpen)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
            </Button>

            {/* /technicians tab */}
            {activeTab === "find" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Showing {techniciansHook.totalCount} technician{techniciansHook.totalCount !== 1 ? "s" : ""}
                  </span>
                  <Select value={techniciansHook.sortKey} onValueChange={(v) => techniciansHook.setSortKey(v as any)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Top rated</SelectItem>
                      <SelectItem value="distance">Nearest first</SelectItem>
                      <SelectItem value="price">Lowest price</SelectItem>
                      <SelectItem value="jobs">Most jobs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {techniciansHook.technicians.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No technicians match your search.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {techniciansHook.technicians.map((tech) => (
                      <TechnicianCard
                        key={tech.id}
                        tech={tech}
                        reviews={MOCK_REVIEWS}
                        onContact={handleContact}
                        onViewReviews={handleViewReviews}
                      />
                    ))}
                  </div>
                )}

                <Button className="w-full" variant="outline" onClick={() => setShowRequestForm(true)}>
                  + Post a repair request — let technicians come to you
                </Button>
              </div>
            )}

            {/* Parts shop tab */}
            {activeTab === "parts" && (
              <PartsShop
                parts={partsHook.parts}
                searchQuery={partsHook.searchQuery}
                setSearchQuery={partsHook.setSearchQuery}
                activeCategory={partsHook.activeCategory}
                setActiveCategory={partsHook.setActiveCategory}
                partTab={partsHook.partTab}
                setPartTab={partsHook.setPartTab}
              />
            )}

            {/* My requests tab */}
            {activeTab === "requests" && (
              <MyRequests 
                requests={requestsHook.requests} 
                userId={userId} 
                onNew={() => setShowRequestForm(true) } 
                onRefresh={requestsHook.refresh} 
                loading={requestsHook.loading} 
              />
            )}

            {/* History tab */}
            {activeTab === "history" && (
              <RepairHistory
                history={historyHook.history}
                totalSpent={historyHook.totalSpent}
                averageRating={historyHook.averageRating}
                activeWarranties={historyHook.activeWarranties}
              />
            )}
          </div>
        </div>
      </div>

      {/* Request form modal */}
      <RequestFormModal
        open={showRequestForm}
        onClose={() => { setShowRequestForm(false); setSelectedTechnician(null); }}
        onSubmit={handleSubmitRequest}
        selectedTechnicianName={selectedTechnician?.name}
      />
      <Footer />
    </div>
  );
}