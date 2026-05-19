export const STATUSES = [
  "pending",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_ITEMS_PER_PAGE = 20;
export const POLLING_INTERVAL = 30000; // 30 seconds

export const STATUS_DISPLAY: Record<string, string> = {
  payment_confirmed: "Payment Confirmed",
  out_for_delivery: "Out for Delivery",
};