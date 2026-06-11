import { PaymentMethodsMap, MpesaSettings } from "@/types/pay.types";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  paypal: "PayPal",
  stripe: "Stripe",
  card: "Card",
  bank_transfer: "Bank Transfer",
  cash_on_delivery: "Cash on Delivery",
};

// Escrow state display labels and colors
export const ESCROW_STATE_LABELS: Record<string, string> = {
  created:              "Order Created",
  payment_pending:      "Waiting for Payment",
  funds_held_in_escrow: "Funds Held in Escrow",
  dispute_raised:       "Dispute Raised",
  waiting:              "Under Review",
  out_for_delivery:     "Out for Delivery",
  delivery_confirmed:   "Delivery Confirmed",
  released_to_seller:   "Released to Seller",
  refunded:             "Refunded",
  payout_completed:     "Payment Complete",
};

export const ESCROW_STATE_COLORS: Record<string, string> = {
  created:              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  payment_pending:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  funds_held_in_escrow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  dispute_raised:       "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  waiting:              "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  out_for_delivery:     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delivery_confirmed:   "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  released_to_seller:   "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  refunded:             "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  payout_completed:     "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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
export const ESCROW_POLLING_INTERVAL = 5000; // 5 seconds for escrow status changes