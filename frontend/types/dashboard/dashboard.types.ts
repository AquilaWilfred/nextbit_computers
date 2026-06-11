export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentReference?: string;
  total: string;
  subtotal: string;
  shippingCost: string;
  shippingFullName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode?: string;
  shippingCountry: string;
  shippingPhone: string;
  deliveryOtp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  price: string;
  quantity: number;
  subtotal: string;
}

export interface OrderHistory {
  id: number;
  status: string;
  note?: string;
  createdAt: string;
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  history: OrderHistory[];
  payment?: { transactionId?: string };
  agent?: { name?: string; phone?: string; vehicleNumber?: string };
}

export interface Address {
  id: number;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}

export interface WishlistItem {
  id: number;
  product: Product;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: unknown;
  stock: number;
}

export interface PublicSettings {
  general?: Record<string, unknown>;
  appearance?: { logoUrl?: string };
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSpent: number;
}

export type DashboardTab = "overview" | "orders" | "addresses" | "wishlist" | "account";