export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  order?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  price: string;
  comparePrice?: string;
  stock: number;
  brand?: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  images: string[];
  specifications?: Record<string, string>;
  tags?: string[];
  featured: boolean;
  active: boolean;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  comparePrice: string;
  stock: string;
  brand: string;
  sku: string;
  description: string;
  shortDescription: string;
  images: string[];
  specifications: string;
  tags: string;
  featured: boolean;
  active: boolean;
}

export type SortConfig = { key: string; direction: "asc" | "desc" } | null;