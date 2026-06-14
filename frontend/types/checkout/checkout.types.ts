export type Step = "shipping" | "review" | "payment";
export type PaymentMethod = "mpesa" | "paypal" | "stripe";

export interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  additionalPhone1?: string;
  additionalPhone2?: string;
  deliveryNote?: string;
  address: string;
  county: string;
  city: string;
  postalCode: string;
  country: string;
  saveAddress: boolean;
  // Delivery pin — set via in-app DeliveryMapModal (Bolt/Glovo style)
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAddress?: string; // reverse-geocoded human label
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
  // Optional saved pin
  lat?: number | null;
  lng?: number | null;
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
  shippingAdditionalPhone1?: string;
  shippingAdditionalPhone2?: string;
  deliveryNote?: string;
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
  // Optional precise delivery pin
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAddress?: string;
}

export interface PlaceOrderResponse {
  orderId: number;
  orderNumber: string;
  escrowId?: string;
  sellerOpenId?: string | null;
  sellerId?: string | null;
}