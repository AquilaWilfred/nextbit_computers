export interface StorePerf {
  store: string;
  orders: number;
  revenue: number;
  aov: number;
}

export interface TrendPoint {
  day: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsData {
  rangeDays: number;
  storePerformance: StorePerf[];
  trend: TrendPoint[];
  federation: { total: number; federated: number };
  transfers: { total: number; completed: number; pending: number; conflicts: number };
}

export type RangeValue = 7 | 30 | 90;

export interface RangeOption {
  label: string;
  value: RangeValue;
}