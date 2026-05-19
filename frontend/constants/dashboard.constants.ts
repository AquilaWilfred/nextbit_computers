import { TimeRange } from "@/types/dashboard.types";

export const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

export const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const STAT_CARDS = [
  {
    label: "Total Revenue",
    key: "totalRevenue" as const,
    trendKey: "revenue" as const,
    Icon: "DollarSign",
    gradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
    iconColor: "text-blue-500",
    formatValue: (val: number) => `KES ${val.toLocaleString()}`,
  },
  {
    label: "Total Orders",
    key: "totalOrders" as const,
    trendKey: "orders" as const,
    Icon: "ShoppingCart",
    gradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
    iconColor: "text-purple-500",
    formatValue: (val: number) => val.toLocaleString(),
  },
  {
    label: "Total Customers",
    key: "totalCustomers" as const,
    trendKey: "customers" as const,
    Icon: "Users",
    gradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
    iconColor: "text-green-500",
    formatValue: (val: number) => val.toLocaleString(),
  },
  {
    label: "Total Products",
    key: "totalProducts" as const,
    trendKey: "products" as const,
    Icon: "Package",
    gradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
    iconColor: "text-orange-500",
    formatValue: (val: number) => val.toLocaleString(),
  },
];