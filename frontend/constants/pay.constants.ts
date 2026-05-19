import { PaymentMethodsMap, MpesaSettings } from "@/types/pay.types";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  paypal: "PayPal",
  stripe: "Stripe",
  card: "Card",
  bank_transfer: "Bank Transfer",
  cash_on_delivery: "Cash on Delivery",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const DEFAULT_MPESA_SETTINGS: MpesaSettings = {
  consumerKey: "",
  consumerSecret: "",
  shortcode: "",
  initiatorName: "",
  initiatorPassword: "",
  certContent: "",
  apiHost: "sandbox",
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethodsMap = {
  mpesa: true,
  paypal: true,
  stripe: true,
  bank_transfer: false,
  cash_on_delivery: true,
};

export const PAYMENT_SORTABLE_COLUMNS = [
  { key: "id", label: "Payment ID" },
  { key: "orderId", label: "Order ID" },
  { key: "method", label: "Method" },
  { key: "amount", label: "Amount", right: true },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Date" },
];

export const PAYOUT_TABLE_COLUMNS = [
  "Request ID",
  "Agent ID",
  "Amount",
  "Requested At",
  "Status",
  "Actions",
];

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];
export const DEFAULT_ITEMS_PER_PAGE = 20;
export const POLLING_INTERVAL = 60000; // 60 seconds