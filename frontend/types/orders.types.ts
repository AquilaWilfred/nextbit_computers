export interface Order {
  id: number;
  orderNumber: string;
  shippingFullName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode?: string;
  shippingCountry: string;
  shippingPhone: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string;
  subtotal: string | number;
  shippingCost: string | number;
  total: string | number;
  createdAt: string;
  trackingNumber?: string;
  deliveryOtp?: string;
  deliveryAgentId?: number;
}

export interface Agent {
  id: number;
  name: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  activeCity?: string;
}

export interface OrderDetail {
  order: Order;
  items: { productName: string; price: number; quantity: number; subtotal: number }[];
  customer?: { email?: string };
  payment?: { transactionId?: string };
}

export interface PublicSettings {
  general?: {
    storeName?: string;
    address?: string;
    contactEmail?: string;
    heroTitle?: string;
    heroDescription?: string;
  };
  appearance?: { logoUrl?: string };
}

export type SortConfig = { key: string; direction: "asc" | "desc" } | null;