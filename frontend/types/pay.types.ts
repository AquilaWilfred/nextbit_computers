export interface Payment {
  id: number;
  orderId: number;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: number;
  agentId: number;
  amount: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  transactionId?: string;
}

export interface AdminStats {
  totalPayouts?: number;
}

export type PaymentMethodsMap = Record<string, boolean>;

export interface MpesaSettings {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  initiatorName: string;
  initiatorPassword: string;
  certContent: string;
  apiHost: string;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PayoutStatus = "pending" | "completed" | "failed";

// ── Escrow State — must match backend escrow_state enum exactly ───────────────
export type EscrowState =
  | "created"
  | "payment_pending"
  | "funds_held_in_escrow"
  | "dispute_raised"
  | "waiting"
  | "delivery_confirmed"
  | "released_to_seller"
  | "refunded"
  | "payout_completed";

export interface DarajaRecord {
  id: string;
  escrowId: string;
  phone: string;
  mpesaCheckoutId: string;
  mpesaMerchantId: string;
  mpesaReceipt?: string;
  paymentConfirmedAt?: string;
  payoutCompletedAt?: string;
  refundCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowRecord {
  id: string;
  order_id: string;       // snake_case — matches backend JSON
  amount: string;         // String — avoids BigDecimal -> f64 loss
  currency: string;
  state: EscrowState;
  fw_tx_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscrowPaymentPayload {
  orderId: string;
  amount: string;
  currency: string;
  buyerPhone: string;
  sellerId: string;
}

export interface EscrowConfirmDeliveryPayload {
  escrowId: string;
}

export interface EscrowReleasePayload {
  escrowId: string;
  sellerPhone: string;
}