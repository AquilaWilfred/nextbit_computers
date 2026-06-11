import { Payment, PayoutRequest, EscrowRecord, EscrowState } from "@/types/pay.types";
import { ESCROW_STATE_COLORS, ESCROW_STATE_LABELS } from "@/constants/pay.constants";
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

export function formatAmount(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return formatPrice(num);
}

const PAYMENT_STATUS_TO_ESCROW_STATE: Record<string, EscrowState> = {
  pending: "payment_pending",
  paid: "funds_held_in_escrow",
  completed: "payout_completed",
  failed: "dispute_raised",
  refunded: "refunded",
};

const PAYOUT_STATUS_TO_ESCROW_STATE: Record<string, EscrowState> = {
  pending: "waiting",
  completed: "payout_completed",
  failed: "dispute_raised",
};

export function getPaymentStatusColor(status: string): string {
  const escrowState = PAYMENT_STATUS_TO_ESCROW_STATE[status] || "payment_pending";
  return getEscrowStateColor(escrowState);
}

export function getPayoutStatusColor(status: string): string {
  const escrowState = PAYOUT_STATUS_TO_ESCROW_STATE[status] || "waiting";
  return getEscrowStateColor(escrowState);
}

// Escrow utilities
export function getEscrowStateColor(state: EscrowState | string): string {
  return ESCROW_STATE_COLORS[state] || ESCROW_STATE_COLORS.pending_payment;
}

export function getEscrowStateLabel(state: EscrowState | string): string {
  return ESCROW_STATE_LABELS[state] || state;
}

export function formatPhoneNumber(phone: string): string {
  // Ensure phone number starts with + and country code
  let cleaned = phone.replace(/\D/g, "");
  
  // If it's a Kenya number starting with 07, convert to +254
  if (cleaned.startsWith("07")) {
    cleaned = "254" + cleaned.substring(1);
  }
  
  // If it's a Kenya number starting with 2547, it's already correct
  // Otherwise, assume it needs a country code if it doesn't have one
  if (!cleaned.startsWith("254") && !cleaned.match(/^\d{12,}/)) {
    // Try to parse as international
    cleaned = "254" + cleaned;
  }
  
  return "+" + cleaned;
}

export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Should be +254XXXXXXXXX (13 characters including +)
  return /^\+254\d{9}$/.test(formatted);
}

export function isEscrowCompletable(escrow: EscrowRecord): boolean {
  return escrow.state === "funds_held";
}

export function isEscrowDisputable(escrow: EscrowRecord): boolean {
  return escrow.state === "funds_held" || escrow.state === "delivery_confirmed";
}

export function isEscrowReleasable(escrow: EscrowRecord): boolean {
  return escrow.state === "delivery_confirmed";
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