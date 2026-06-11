import { useState, useEffect, useCallback, useRef } from "react";
import { cartService } from "@/lib/services/cart/cart.service";
import { AuthCartItem, GuestCartDisplayItem, CartItemDisplay } from "@/types/cart/cart.types";
import { getGuestCart } from "@/lib/cart";

const CACHE_KEY = "cart_cache";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CacheEntry {
  items: AuthCartItem[];
  timestamp: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(items: AuthCartItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
  } catch {}
}

export function useCart(isAuthenticated: boolean) {
  const cached = isAuthenticated ? readCache() : null;

  const [authCart, setAuthCart] = useState<AuthCartItem[]>(cached?.items ?? []);
  const [authLoading, setAuthLoading] = useState(isAuthenticated && !cached);
  const [guestItems, setGuestItems] = useState<GuestCartDisplayItem[]>(() =>
    !isAuthenticated ? getGuestCart() : []
  );
  const isFetchingRef = useRef(false);

  const fetchAuthCart = useCallback(async (silent = false) => {
    if (!isAuthenticated || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setAuthLoading(true);
    try {
      const data = await cartService.fetchAuthCart();
      setAuthCart(data);
      writeCache(data);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setAuthLoading(false);
    }
  }, [isAuthenticated]);

  const loadGuestCart = useCallback(() => {
    if (!isAuthenticated) setGuestItems(getGuestCart());
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAuthCart(!!cached); // silent if cached, show loader if not
    } else {
      loadGuestCart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const items: CartItemDisplay[] = isAuthenticated
    ? authCart.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        name: i.product.name,
        price: i.product.price,
        image: i.product.images?.[0],
        slug: i.product.slug,
        stock: i.product.stock,
        brand: i.product.brand,
      }))
    : guestItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.name ?? `Product #${item.productId}`,
        price: item.price ?? 0,
        image: item.image,
        slug: item.slug,
        stock: item.stock,
        brand: item.brand,
      }));

  return {
    items,
    isLoading: isAuthenticated ? authLoading : false,
    refreshAuthCart: () => fetchAuthCart(false),
    refreshGuestCart: loadGuestCart,
  };
}