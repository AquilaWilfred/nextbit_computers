import { AuthCartItem } from "@/types/cart/cart.types";

class CartService {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async fetchAuthCart(): Promise<AuthCartItem[]> {
    const raw = await this.fetch<any[]>("/api/cart");
    return raw.map((i: any) => ({
      id: i.id,
      productId: i.product_id,
      quantity: i.quantity,
      product: {
        name: i.product_name,
        price: i.product_price,
        images: i.product_images ?? [],
        slug: i.product_slug ?? "",
        stock: i.product_stock ?? 99,
        brand: i.product_brand ?? null,
      },
    }));
  }

  async upsertCartItem(productId: number, quantity: number): Promise<void> {
    await this.fetch("/api/cart/upsert", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async removeCartItem(itemId: number): Promise<void> {
    await this.fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
  }
}

export const cartService = new CartService();