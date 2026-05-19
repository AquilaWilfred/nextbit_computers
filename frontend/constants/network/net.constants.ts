import { RangeOption } from "@/types/network/analytics.types";

export const RANGE_OPTIONS: RangeOption[] = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
export const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export const TRANSFER_CATEGORIES = [
  { label: "Completed", key: "completed" as const, icon: "CheckCircle2", color: "text-emerald-500" },
  { label: "Pending", key: "pending" as const, icon: "Clock", color: "text-amber-500" },
  { label: "Conflicts", key: "conflicts" as const, icon: "AlertTriangle", color: "text-red-500" },
];

export const STAT_CARDS = [
  { label: "Network Revenue", key: "revenue" as const, icon: "TrendingUp", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Total Orders", key: "orders" as const, icon: "BarChart3", color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Stores Federated", key: "federation" as const, icon: "Globe2", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Transfers", key: "transfers" as const, icon: "ArrowRightLeft", color: "text-amber-500", bg: "bg-amber-500/10" },
];