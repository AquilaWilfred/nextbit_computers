// types/home.types.ts
export interface Branch {
  id: number;
  name: string;
  address?: string;
  lat: string | number;
  lng: string | number;
  phone?: string;
  isMain?: boolean;
  hours?: { label: string; value: string }[];
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  images: unknown;
  featured?: boolean;
  slug: string;
  stock: number;
  [key: string]: unknown;
}

export interface Banner {
  id: number;
  title: string;
  description?: string;
  image: string;
  active?: boolean;
  order?: number;
}

export interface Promotion {
  id: number;
  title: string;
  description?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  featured?: boolean;
  active?: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  image?: string;
  linkUrl?: string;
  active?: boolean;
}

export interface Settings {
  general?: {
    storeName?: string;
    heroTitle?: string;
    heroDescription?: string;
    heroBadge?: string;
    ctaTitle?: string;
    ctaDescription?: string;
    floatingBadge1?: { icon: string; title: string; desc: string };
    floatingBadge2?: { icon: string; title: string; desc: string };
    features?: { icon: string; title: string; desc: string }[];
    lifestyles?: Lifestyle[];
    statsProductCount?: number;
    statsCustomerCount?: number;
    statsAvgRating?: string;
    address?: string;
  };
  shipping?: { freeShippingThreshold?: number };
  brands?: string[];
}

export interface Lifestyle {
  title: string;
  description: string;
  icon: string;
  color?: string;
  link: string;
}

export interface LiveStats {
  products: number;
  customers: number;
  orders: number;
}

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  title: string;
  isMain?: boolean;
}

export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  showRouteTo: 
  (
    lat: number, 
    lng: number, 
    origin?: { 
        lat: number; 
        lng: number 
    }
  ) => Promise<void>;
  clearRoute: () => void;
}