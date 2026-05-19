import { Product, SortConfig, ProductFormData } from "@/types/products/man/products.types";
import { STOCK_THRESHOLDS } from "@/constants/products/man/man.products.constants";
import { formatPrice } from "@/lib/cart";

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function generateSlug(name: string, existingSlug?: string): string {
  return existingSlug || slugify(name);
}

export function parseSpecifications(specsString: string): Record<string, string> {
  const specs: Record<string, string> = {};
  specsString.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      specs[key.trim()] = valueParts.join(":").trim();
    }
  });
  return specs;
}

export function formatSpecificationsToString(specs?: Record<string, string>): string {
  if (!specs) return "";
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export function parseTags(tagsString: string): string[] {
  return tagsString.split(",").map((t) => t.trim()).filter(Boolean);
}

export function formatTagsToString(tags?: string[]): string {
  return tags?.join(", ") || "";
}

export function calculateDiscountPercentage(price: number, comparePrice: number): number {
  if (comparePrice <= 0) return 0;
  return Math.round((1 - price / comparePrice) * 100);
}

export function applyDiscount(price: number, percentage: number): string {
  return (price * (1 - percentage / 100)).toFixed(2);
}

export function sortProducts(products: Product[], sortConfig: SortConfig): Product[] {
  if (!sortConfig) return products;
  
  return [...products].sort((a, b) => {
    let aVal = (a as any)[sortConfig.key];
    let bVal = (b as any)[sortConfig.key];
    
    if (["price", "stock"].includes(sortConfig.key)) {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function getStockBadgeColor(stock: number): string {
  if (stock > STOCK_THRESHOLDS.HIGH) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  if (stock > STOCK_THRESHOLDS.MEDIUM) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}