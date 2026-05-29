export type DeviceType = "laptop" | "desktop" | "tablet" | "monitor" | "printer" | "other" | "phone" | "headphones" | "camera";
export type Condition = "excellent" | "good" | "fair";
export type TradeInStatus = "pending_verification" | "listed" | "sold" | "rejected";

export interface TradeInRequest {
  id: number;
  listing_number: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  condition: Condition;
  asking_price_kes: number;
  status: TradeInStatus;
  credit_issued_kes: number | null;
  created_at: string;
  specs?: string;
  images?: string[];
  drop_branch?: string;
  seller_name?: string;
  seller_rating?: number;
  views?: number;
  location?: string;
  visible?: boolean;
}

export interface UserStats {
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_credit_earned: number;
  total_views: number;
}

export interface TradeInFormData {
  device_type: DeviceType;
  brand: string;
  model: string;
  condition: Condition;
  asking_price_kes: number;
  drop_branch: string;
  specs?: string;
  location?: string;
  images: File[];
}

export interface ConditionMeta {
  label: string;
  sub: string;
  multiplier: number;
  badgeColor: string;
  buttonColor: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}