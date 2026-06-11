import { CartItem } from "@/types/checkout/checkout.types";

export class CartService {
  static async fetchCart(isAuthenticated: boolean): Promise<CartItem[]> {
    if (!isAuthenticated) return [];
    
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error();
      const raw = await res.json();
      return raw.map((i: any) => ({
        productId: i.product_id,
        quantity: i.quantity,
        product: {
          name: i.product_name,
          price: String(i.product_price),
          images: i.product_images ?? [],
          slug: i.product_slug ?? "",
          stock: i.product_stock ?? 99,
          brand: i.product_brand ?? null,
        },
      }));
    } catch {
      throw new Error("Failed to load cart");
    }
  }

  static validateStock(cartItems: CartItem[]): boolean {
    const violation = cartItems.find(
      (item) => item.quantity > (item.product.stock ?? 0)
    );
    if (violation) {
      throw new Error(
        `Only ${violation.product.stock ?? 0} units of ${violation.product.name} are available.`
      );
    }
    return true;
  }
}