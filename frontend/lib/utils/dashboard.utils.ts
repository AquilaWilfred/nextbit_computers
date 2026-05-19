import { Order } from "@/types/dashboard.types";

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function getRecentOrders(orders: Order[], limit: number = 5): Order[] {
  return orders?.slice(0, limit) ?? [];
}