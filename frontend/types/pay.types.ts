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