import { Payment, PayoutRequest } from "@/types/pay.types";
import { PAYMENT_STATUS_COLORS, PAYOUT_STATUS_COLORS } from "@/constants/pay.constants";
import { formatPrice } from "@/lib/cart";

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

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function formatAmount(amount: number): string {
  return formatPrice(amount);
}

export function getPaymentStatusColor(status: string): string {
  return PAYMENT_STATUS_COLORS[status] || PAYMENT_STATUS_COLORS.pending;
}

export function getPayoutStatusColor(status: string): string {
  return PAYOUT_STATUS_COLORS[status] || PAYOUT_STATUS_COLORS.pending;
}

export function filterPaymentsByDateRange(
  payments: Payment[],
  startDate: string,
  endDate: string
): Payment[] {
  return payments.filter((p) => {
    let matches = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matches = matches && new Date(p.createdAt) >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matches = matches && new Date(p.createdAt) <= end;
    }
    return matches;
  });
}

export function filterPayoutsByDateRange(
  payouts: PayoutRequest[],
  startDate: string,
  endDate: string
): PayoutRequest[] {
  return payouts.filter((p) => {
    let matches = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matches = matches && new Date(p.requestedAt) >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matches = matches && new Date(p.requestedAt) <= end;
    }
    return matches;
  });
}

export function calculatePaymentStats(payments: Payment[]) {
  return {
    total: payments.length,
    pending: payments.filter((p) => p.status === "pending").length,
    failed: payments.filter((p) => p.status === "failed").length,
  };
}

export function calculatePayoutStats(payouts: PayoutRequest[]) {
  const pending = payouts.filter((p) => p.status === "pending");
  return {
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, p) => sum + parseFloat(p.amount), 0),
  };
}


export function sortPayments(
  payments: Payment[],
  sortConfig: { key: string; direction: "asc" | "desc" } | null
): Payment[] {
  if (!sortConfig) return payments;
  
  return [...payments].sort((a, b) => {
    let aVal = (a as any)[sortConfig.key];
    let bVal = (b as any)[sortConfig.key];
    
    if (sortConfig.key === "amount") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}