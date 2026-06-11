export type Step = "shipping" | "review" | "payment";
export type PaymentMethod = "mpesa" | "paypal" | "stripe";

export interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  city: string;
  postalCode: string;
  country: string;
  saveAddress: boolean;
}

export interface CartItem {
  productId: number;
  quantity: number;
  product: {
    name: string;
    price: string;
    images: string[];
    slug: string;
    stock: number;
    brand: string | null;
  };
}

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode?: string | null;
  country: string;
  county?: string;
}

export interface PublicSettings {
  payment_methods?: Record<string, boolean>;
  shipping?: {
    freeShippingThreshold?: string;
    standardFee?: string;
    expressDelivery?: string;
  };
  general?: {
    features?: { title: string }[];
  };
}

export interface OrderTotals {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  isExpress: boolean;
}

export interface PlaceOrderRequest {
  items: Array<{ product_id: number; quantity: number }>;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCounty?: string;
  shippingCity: string;
  shippingPostalCode?: string;
  shippingCountry: string;
  shippingEmail?: string;
  paymentMethod: PaymentMethod;
  isExpress: boolean;
  discountCode?: string;
  saveAddress: boolean;
}

export interface PlaceOrderResponse {
  orderId: number;
  orderNumber: string;
  escrowId?: string;
  sellerOpenId?: string | null;
  sellerId?: string | null;
}