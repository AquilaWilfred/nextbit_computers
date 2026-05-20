"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type DeviceType = "laptop" | "desktop" | "tablet" | "monitor" | "printer" | "other" | "phone" | "headphones" | "camera";
type Condition = "excellent" | "good" | "fair";

interface TradeInRequest {
  id: number;
  listing_number: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  condition: Condition;
  asking_price_kes: number;
  status: "pending_verification" | "listed" | "sold" | "rejected";
  credit_issued_kes: number | null;
  created_at: string;
  specs?: string;
  images?: string[];
  drop_branch?: string;
  seller_name?: string;
  seller_rating?: number;
  views?: number;
  location?: string;
}

interface UserStats {
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_credit_earned: number;
  total_views: number;
}

const DEVICE_LABELS: Record<DeviceType, string> = {
  laptop: "Laptop", desktop: "Desktop / PC", tablet: "Tablet",
  monitor: "Monitor", printer: "Printer", other: "Other",
  phone: "Smartphone", headphones: "Headphones", camera: "Camera",
};

const CONDITION_META: Record<Condition, { label: string; sub: string; multiplier: number; badgeColor: string }> = {
  excellent: { label: "Excellent", sub: "Like new, no visible wear", multiplier: 1.0, badgeColor: "bg-green-100 text-green-700" },
  good: { label: "Good", sub: "Minor wear, fully functional", multiplier: 0.8, badgeColor: "bg-blue-100 text-blue-700" },
  fair: { label: "Fair", sub: "Visible wear, fully functional", multiplier: 0.6, badgeColor: "bg-yellow-100 text-yellow-700" },
};

const STATUS_LABEL: Record<TradeInRequest["status"], string> = {
  pending_verification: "Awaiting seller check",
  listed: "Live on marketplace",
  sold: "Sold ✅",
  rejected: "Not accepted",
};

const STATUS_COLOR: Record<TradeInRequest["status"], string> = {
  pending_verification: "#EF9F27",
  listed: "#378ADD",
  sold: "#639922",
  rejected: "#E24B4A",
};

// API Service
const tradeInApi = {
  async getListings(status?: string): Promise<TradeInRequest[]> {
    const url = status ? `/api/tradein/listings?status=${status}` : '/api/tradein/listings';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch listings');
    return res.json();
  },
  
  async getStats(): Promise<UserStats> {
    const res = await fetch('/api/tradein/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
  
  async createListing(data: FormData): Promise<TradeInRequest> {
    const res = await fetch('/api/tradein/listings', {
      method: 'POST',
      body: data,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create listing');
    }
    return res.json();
  },
  
  async updateListing(id: number, data: Partial<TradeInRequest>): Promise<TradeInRequest> {
    const res = await fetch(`/api/tradein/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update listing');
    return res.json();
  },
  
  async deleteListing(id: number): Promise<void> {
    const res = await fetch(`/api/tradein/listings/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete listing');
  },
};

export default function TradeInPage() {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total_listings: 0,
    active_listings: 0,
    sold_listings: 0,
    total_credit_earned: 0,
    total_views: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deviceType, setDeviceType] = useState<DeviceType>("laptop");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [askingPrice, setAskingPrice] = useState("");
  const [specs, setSpecs] = useState("");
  const [dropBranch, setDropBranch] = useState("");
  const [location, setLocation] = useState("");

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listingsData, statsData] = await Promise.all([
        tradeInApi.getListings(statusFilter === "all" ? undefined : statusFilter),
        tradeInApi.getStats(),
      ]);
      setRequests(listingsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 5 - selectedImages.length;
    
    if (files.length > remainingSlots) {
      toast.error(`You can only upload up to 5 images. You have ${selectedImages.length} already selected.`);
      return;
    }
    
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) toast.error(`${file.name} is not an image file.`);
      if (!isValidSize) toast.error(`${file.name} exceeds 5MB limit.`);
      return isValidType && isValidSize;
    });
    
    if (validFiles.length === 0) return;
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setSelectedImages(prev => [...prev, ...validFiles]);
  };
  
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const clearImages = () => {
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setSelectedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!brand.trim() || !model.trim() || !askingPrice || !dropBranch.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const price = parseInt(askingPrice.replace(/,/g, ""), 10);
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid asking price in KES.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('device_type', deviceType);
      formData.append('brand', brand);
      formData.append('model', model);
      formData.append('condition', condition);
      formData.append('asking_price_kes', price.toString());
      formData.append('drop_branch', dropBranch);
      if (specs) formData.append('specs', specs);
      if (location) formData.append('location', location);
      
      selectedImages.forEach((image, index) => {
        formData.append(`images`, image);
      });
      
      await tradeInApi.createListing(formData);
      
      toast.success(`Trade-in submitted with ${selectedImages.length} image(s). Your listing will appear after verification.`);
      setShowForm(false);
      setBrand(""); setModel(""); setAskingPrice(""); setSpecs(""); setDropBranch(""); setLocation("");
      clearImages();
      loadData(); // Reload listings
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCreditEarned = stats.total_credit_earned;
  const activeListings = stats.active_listings;
  const soldCount = stats.sold_listings;
  const pendingCount = requests.filter(r => r.status === "pending_verification").length;

  const filteredRequests = requests.filter(r => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">Trade-In Program</span>
                <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">📱 Working Devices Only</span>
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">✨ Earn Platform Credit</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Sell Your Device</h1>
              <p className="text-gray-500 max-w-2xl mt-2">
                List your working device for sale on NextBit Marketplace. Get verified, listed, and earn platform credit when it sells.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <span>📱</span> + List Your Device
            </button>
          </div>

          {/* Stats Row - Your Selling Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Active listings</div>
              <div className="text-2xl font-bold text-blue-700">{activeListings}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Sold devices</div>
              <div className="text-2xl font-bold text-green-600">{soldCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Pending verification</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total credit earned</div>
              <div className="text-2xl font-bold text-blue-600">KES {totalCreditEarned.toLocaleString()}</div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {[
              { step: "1", title: "Submit device", desc: "Fill in device details & photos", icon: "📝" },
              { step: "2", title: "Seller verification", desc: "Physical check & QISJ grade", icon: "🔍" },
              { step: "3", title: "Live on marketplace", desc: "Visible to all buyers", icon: "🛒" },
              { step: "4", title: "Get paid", desc: "Credit to your wallet", icon: "💰" },
            ].map((item) => (
              <div key={item.step} className="border-l-2 border-blue-500 pl-3">
                <div className="text-sm font-semibold text-gray-800">{item.icon} {item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "all" ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All Listings ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending_verification")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "pending_verification" ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("listed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "listed" ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Live ({activeListings})
          </button>
          <button
            onClick={() => setStatusFilter("sold")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === "sold" ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Sold ({soldCount})
          </button>
        </div>

        {/* Your Listings Section */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm border border-dashed rounded-xl">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-medium">No trade-in requests yet</p>
            <p className="text-xs mt-1">Click "List Your Device" to start selling on NextBit Marketplace</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(r => (
              <div key={r.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
                <div className="flex flex-wrap md:flex-nowrap gap-5">
                  {/* Thumbnail */}
                  <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={r.images?.[0] || "https://placehold.co/600x400/2563EB/white?text=Device"} alt={r.model} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800 text-lg">{r.brand} {r.model}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_COLOR[r.status] + '22', color: STATUS_COLOR[r.status] }}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{DEVICE_LABELS[r.device_type]} · {CONDITION_META[r.condition].label}</div>
                        {r.specs && <div className="text-sm text-gray-600 mt-2">{r.specs}</div>}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-700">KES {r.asking_price_kes.toLocaleString()}</span>
                        {r.credit_issued_kes && (
                          <div className="text-green-600 text-sm font-medium mt-1">💰 Paid: KES {r.credit_issued_kes.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <span>📅 Listed: {new Date(r.created_at).toLocaleDateString()}</span>
                      {r.views && r.views > 0 && <span>👁️ {r.views} views</span>}
                      {r.location && <span>📍 {r.location}</span>}
                      {r.drop_branch && <span>🏪 Drop-off: {r.drop_branch}</span>}
                      {r.status === "listed" && <span className="text-blue-600">🟢 Active on marketplace</span>}
                      {r.status === "pending_verification" && <span className="text-yellow-600">⏳ Awaiting seller verification (24-48hrs)</span>}
                      {r.status === "sold" && <span className="text-green-600">✅ Sale completed - Credit issued</span>}
                    </div>
                    
                    {/* Image thumbnails gallery */}
                    {r.images && r.images.length > 1 && (
                      <div className="flex gap-2 mt-3">
                        {r.images.slice(1, 4).map((img, idx) => (
                          <img key={idx} src={img} alt={`${r.brand} ${r.model}`} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                        ))}
                        {r.images.length > 4 && (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 border border-gray-200">
                            +{r.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trade-in Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white flex justify-between items-center sticky top-0 bg-white">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">List Your Device</h3>
                  <p className="text-sm text-gray-500 mt-1">Fill in the details below to start selling on NextBit Marketplace</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-5">&times;</button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Two-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Device Type *</label>
                    <select value={deviceType} onChange={e => setDeviceType(e.target.value as DeviceType)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm">
                      {(Object.keys(DEVICE_LABELS) as DeviceType[]).map(k => <option key={k} value={k}>{DEVICE_LABELS[k]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
                    <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Apple, Samsung, Dell" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model *</label>
                    <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. iPhone 14 Pro, Galaxy S23" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Asking Price (KES) *</label>
                    <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} placeholder="e.g. 45000" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Condition *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(CONDITION_META) as Condition[]).map(c => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCondition(c)}
                        className={`p-3 rounded-xl border-2 text-left transition ${condition === c ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className="font-semibold text-sm">{CONDITION_META[c].label}</div>
                        <div className="text-xs text-gray-500 mt-1">{CONDITION_META[c].sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Device Photos (Max 5)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                    <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB each. {selectedImages.length}/5 selected.</p>
                  </div>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mt-4">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition shadow-md">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Nairobi, Mombasa" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Drop-off Branch *</label>
                    <input value={dropBranch} onChange={e => setDropBranch(e.target.value)} placeholder="Select your nearest NextBit seller branch" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specifications & Notes</label>
                  <textarea value={specs} onChange={e => setSpecs(e.target.value)} rows={4} placeholder="RAM, storage, CPU, battery health, accessories included, cosmetic condition, etc." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-vertical" />
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                      <strong className="block mb-1">What happens next?</strong>
                      <ul className="text-xs space-y-1 list-disc pl-4">
                        <li>A seller will verify your device at the drop-off branch</li>
                        <li>Device gets QISJ grade and listed on marketplace</li>
                        <li>You receive platform credit when sold (minus small fee)</li>
                        <li>Average time to sell: 3-7 days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={handleSubmit} disabled={submitting} className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition ${submitting ? 'bg-blue-300' : 'bg-blue-700 hover:bg-blue-800'}`}>
                    {submitting ? "Submitting..." : "List on Marketplace"}
                  </button>
                  <button onClick={() => { setShowForm(false); clearImages(); }} className="flex-1 border border-gray-300 bg-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}