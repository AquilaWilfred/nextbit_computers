// constants/admin.listings.constants.ts

import { DeviceType, Condition, TradeInStatus, SortBy } from "@/types/listings/admin.listings.types";

export const DEVICE_LABELS: Record<DeviceType, string> = {
  laptop: "Laptop",
  desktop: "Desktop / PC",
  tablet: "Tablet",
  monitor: "Monitor",
  printer: "Printer",
  other: "Other",
  phone: "Smartphone",
  headphones: "Headphones",
  camera: "Camera",
};

export const CONDITION_CONFIG: Record<Condition, { label: string; badgeColor: string; multiplier: number; bgColor: string }> = {
  excellent: { 
    label: "Excellent", 
    badgeColor: "#16a34a", 
    bgColor: "#dcfce7",
    multiplier: 1.0 
  },
  good: { 
    label: "Good", 
    badgeColor: "#2563eb", 
    bgColor: "#dbeafe",
    multiplier: 0.8 
  },
  fair: { 
    label: "Fair", 
    badgeColor: "#d97706", 
    bgColor: "#fef3c7",
    multiplier: 0.6 
  },
};

export const STATUS_CONFIG: Record<TradeInStatus, { label: string; color: string; bg: string }> = {
  pending_verification: { 
    label: "Pending",  
    color: "#b45309", 
    bg: "#fef3c7" 
  },
  listed: { 
    label: "Live",     
    color: "#1d4ed8", 
    bg: "#dbeafe" 
  },
  sold: { 
    label: "Sold",     
    color: "#15803d", 
    bg: "#dcfce7" 
  },
  rejected: { 
    label: "Rejected", 
    color: "#b91c1c", 
    bg: "#fee2e2" 
  },
};

export const STATUS_OPTIONS: { value: "all" | TradeInStatus; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending_verification", label: "Pending" },
  { value: "listed", label: "Live" },
  { value: "sold", label: "Sold" },
  { value: "rejected", label: "Rejected" },
];

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date", label: "Sort: Newest" },
  { value: "price", label: "Sort: Price ↓" },
  { value: "views", label: "Sort: Most Views" },
];

export const STAT_CARDS_CONFIG = [
  { key: "total_listings", icon: "📦", label: "Total Submissions", accent: "#6366f1" },
  { key: "pending_listings", icon: "⏳", label: "Pending Verification", accent: "#f59e0b", sub: "Needs review" },
  { key: "listed_listings", icon: "🟢", label: "Live Listings", accent: "#2563eb" },
  { key: "sold_listings", icon: "✅", label: "Sold Devices", accent: "#16a34a" },
  { key: "rejected_listings", icon: "✗", label: "Rejected", accent: "#dc2626" },
  { key: "total_credit_issued", icon: "💰", label: "Total Credit Issued", accent: "#0891b2", isCurrency: true },
  { key: "total_gmv", icon: "📊", label: "Total GMV (Sold)", accent: "#7c3aed", isCurrency: true },
  { key: "total_views", icon: "👁️", label: "Total Listing Views", accent: "#db2777" },
  { key: "avg_price", icon: "📈", label: "Avg. Asking Price", accent: "#0d9488", isCurrency: true },
];

export const API_BASE = "/api/admin/tradein";
export const QUERY_STALE_TIME = 30000; // 30 seconds
export const ITEMS_PER_PAGE = 20;