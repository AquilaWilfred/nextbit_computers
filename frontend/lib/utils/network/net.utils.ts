import { AnalyticsData, StorePerf } from "@/types/network/analytics.types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatCompactNumber(value: number): string {
  return `${(value / 1000).toFixed(0)}k`;
}

export function formatDay(day: string): string {
  return day.slice(5); // Returns MM-DD
}

export function calculateFederationPercentage(federated: number, total: number): number {
  return Math.round((federated / Math.max(total, 1)) * 100);
}

export function getTransferPieData(transfers: AnalyticsData["transfers"]) {
  return [
    { name: "Completed", value: transfers.completed },
    { name: "Pending", value: transfers.pending },
    { name: "Conflicts", value: transfers.conflicts },
  ].filter(d => d.value > 0);
}

export function getTotalRevenue(storePerformance: StorePerf[]): number {
  return storePerformance.reduce((sum, store) => sum + store.revenue, 0);
}

export function getTotalOrders(storePerformance: StorePerf[]): number {
  return storePerformance.reduce((sum, store) => sum + store.orders, 0);
}