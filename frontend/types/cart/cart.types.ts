export interface GuestCartDisplayItem {
  productId: number;
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
  slug?: string;
  stock?: number;
  brand?: string | null;
}

export interface AuthCartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    name: string;
    price: number;
    images: string[];
    slug: string;
    stock: number;
    brand: string | null;
  };
}

export interface CartItemDisplay {
  id?: number;
  productId: number;
  quantity: number;
  name?: string;
  price: number;
  image?: string;
  slug?: string;
  stock?: number;
  brand?: string | null;
}

export interface PublicSettings {
  shipping?: {
    freeShippingThreshold?: string;
    standardFee?: string;
  };
  general?: {
    features?: { title: string }[];
  };
}

export interface CartTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
  freeThreshold: number;
  standardFee: number;
  remainingForFreeShipping: number;
}