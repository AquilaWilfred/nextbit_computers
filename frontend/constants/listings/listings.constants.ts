import { DeviceType, Condition, ConditionMeta, StatusConfig, TradeInStatus } from "@/types/listings/listings.types";
import { DEVICE_LABELS } from '@/constants/devices.constants';

// Re-export for backwards compatibility
export { DEVICE_LABELS };


export const CONDITION_META: Record<Condition, ConditionMeta> = {
  excellent: { 
    label: "Excellent", 
    sub: "Like new, no visible wear", 
    multiplier: 1.0, 
    badgeColor: "bg-emerald-500 text-white",
    buttonColor: "border-emerald-600 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/40"
  },
  good: { 
    label: "Good", 
    sub: "Minor wear, fully functional", 
    multiplier: 0.8, 
    badgeColor: "bg-blue-500 text-white",
    buttonColor: "border-blue-600 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-lg shadow-blue-500/40"
  },
  fair: { 
    label: "Fair", 
    sub: "Visible wear, fully functional", 
    multiplier: 0.6, 
    badgeColor: "bg-amber-500 text-white",
    buttonColor: "border-amber-600 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-amber-500/40"
  },
};

export const STATUS_CONFIG: Record<TradeInStatus, StatusConfig> = {
  pending_verification: { 
    label: "Awaiting seller check", 
    color: "#EF9F27", 
    bgColor: "bg-yellow-50 text-yellow-700" 
  },
  listed: { 
    label: "Live on marketplace", 
    color: "#378ADD", 
    bgColor: "bg-blue-50 text-blue-700" 
  },
  sold: { 
    label: "Sold ✅", 
    color: "#639922", 
    bgColor: "bg-green-50 text-green-700" 
  },
  rejected: { 
    label: "Not accepted", 
    color: "#E24B4A", 
    bgColor: "bg-red-50 text-red-700" 
  },
};

// Enhanced with strict step indexing and formatting semantic pairs
export const HOW_IT_WORKS_STEPS = [
  { step: "1", title: "Submit device", desc: "Fill in device details & photos", icon: "📝" },
  { step: "2", title: "Seller verification", desc: "Physical check & QISJ grade", icon: "🔍" },
  { step: "3", title: "Live on marketplace", desc: "Visible to all buyers", icon: "🛒" },
  { step: "4", title: "Get paid", desc: "Credit to your wallet", icon: "💰" },
] as const;

export const MAX_IMAGES = 5;
export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const QUERY_STALE_TIME = 30000; // 30 seconds
export const CACHE_KEY_TRADE_IN = 'trade_in_listings';
export const CACHE_KEY_STATS = 'trade_in_stats';