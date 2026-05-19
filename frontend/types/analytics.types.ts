export interface AnalyticsTrend {
  pageViews?: number;
  conversion?: number;
  aov?: number;
  returning?: number;
  revenue?: number;
  orders?: number;
  customers?: number;
  products?: number;
}

export interface AnalyticsDataPoint {
  date?: string;
  revenue?: number;
  visitors?: number;
  organicRevenue?: number;
  aiRevenue?: number;
}

export interface AnalyticsCategoryData {
  name?: string;
  sales?: number;
}

export interface AnalyticsBrandData {
  name?: string;
  sales?: number;
}

export interface AnalyticsTrafficData {
  name?: string;
  value?: number;
}

export interface AnalyticsStats {
  revenueData?: AnalyticsDataPoint[];
  categoryData?: AnalyticsCategoryData[];
  brandData?: AnalyticsBrandData[];
  trafficSourceData?: AnalyticsTrafficData[];
  totalOrders?: number;
  totalRevenue?: number | string;
  totalCustomers?: number;
  returningUsersCount?: number;
  trends?: AnalyticsTrend;
  aiRevenueData?: AnalyticsDataPoint[];
}

export type TimeRange = "7d" | "30d" | "90d" | "12m";