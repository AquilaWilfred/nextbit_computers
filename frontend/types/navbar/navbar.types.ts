export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string | null;
  order?: number;
  active?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
}

export interface PublicSettings {
  general?: { storeName?: string };
  appearance?: {
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoTextSide?: string;
    logoTextDisplay?: string;
    logoTextSpacing?: number;
    logoOpacity?: number;
    logoCropMode?: string;
    logoCropAmount?: number;
    logoTextItems?: Array<{
      text: string;
      font?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
      position?: string;
    }>;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: any[];
  suggestions?: string[];
}

export interface AiHistoryEntry {
  role: string;
  message: string;
}