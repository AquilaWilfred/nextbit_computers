import { Category, PublicSettings } from "@/types/navbar/navbar.types";

class NavbarService {
  private async fetch<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json() as Promise<T>;
  }

  async getCategories(): Promise<Category[]> {
    return this.fetch<Category[]>("/api/categories");
  }

  async getPublicSettings(): Promise<PublicSettings> {
    return this.fetch<PublicSettings>("/api/settings/public");
  }

  async searchProducts(query: string): Promise<any[]> {
    if (!query || query.length <= 1) return [];
    return this.fetch<any[]>(`/products?search=${encodeURIComponent(query)}&limit=5`);
  }

  getOrderedCategories(categories: Category[]): Category[] {
    const active = categories.filter((c) => c.active !== false);
    return [...active].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  getRootCategories(categories: Category[]): Category[] {
    return categories.filter((c) => !c.parentId);
  }

  getChildCategories(categories: Category[], parentId: string): Category[] {
    return categories.filter((c) => c.parentId === parentId);
  }
}

export const navbarService = new NavbarService();