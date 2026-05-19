export type MonthlyData = { month: string; revenue: number; orders: number };
export type ProductPerf = { name: string; value: number };

export type Order = {
  id: string;
  orderNumber: string;
  shippingFullName?: string;
  createdAt: string;
  status: string;
  total: number;
};

export type Trends = {
  revenue?: number;
  orders?: number;
  customers?: number;
  products?: number;
};

export type AdminStats = {
  monthlyRevenueData?: MonthlyData[];
  productPerformanceData?: ProductPerf[];
  recentOrders?: Order[];
  totalRevenue?: number;
  totalOrders?: number;
  totalCustomers?: number;
  totalProducts?: number;
  trends?: Trends;
};

export type TimeRange = "7d" | "30d" | "90d" | "12m";