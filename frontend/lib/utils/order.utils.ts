import { Order, SortConfig } from "@/types/orders.types";
import { Agent } from "@/types/orders.types";

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatStatus(status: string): string {
  const display: Record<string, string> = {
    payment_confirmed: "Payment Confirmed",
    out_for_delivery: "Out for Delivery",
  };
  return display[status] || status.replace(/_/g, " ");
}

export function getAgentStatusMessage(agent: Agent, orderCity: string): string {
  if (!agent.isAvailable) return " (Offline)";
  if (agent.activeCity && agent.activeCity !== orderCity) return ` (Busy in ${agent.activeCity})`;
  if (agent.activeCity === orderCity) return ` (Active in ${agent.activeCity})`;
  return "";
}

export function sortOrders(orders: Order[], sortConfig: SortConfig): Order[] {
  if (!sortConfig) return orders;
  
  return [...orders].sort((a, b) => {
    let aVal = (a as any)[sortConfig.key];
    let bVal = (b as any)[sortConfig.key];
    
    if (sortConfig.key === "total") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}