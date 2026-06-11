// types/listings/admin.listings.types.ts

export type DeviceType = "laptop" | "desktop" | "tablet" | "monitor" | "printer" | "other" | "phone" | "headphones" | "camera";
export type Condition = "excellent" | "good" | "fair";
export type TradeInStatus = "pending_verification" | "listed" | "sold" | "rejected";
export type SortBy = "date" | "price" | "views";

export interface AdminListing {
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
  user_id: number;
  user_email: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  sold_at?: string;
}

export interface AdminStats {
  total_listings: number;
  pending_listings: number;
  listed_listings: number;
  sold_listings: number;
  rejected_listings: number;
  total_gmv: number;
  total_credit_issued: number;
  total_views: number;
  avg_price: number;
  device_breakdown: Record<string, number>;
  branches: string[];
}

export interface FilterState {
  status: "all" | TradeInStatus;
  deviceType: "all" | DeviceType;
  branch: string;
  search: string;
  sortBy: SortBy;
}

export interface GetListingsParams {
  status?: string;
  device_type?: string;
  branch?: string;
  search?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface StatusUpdatePayload {
  status: TradeInStatus;
  credit_amount?: number;
  rejection_reason?: string;
}