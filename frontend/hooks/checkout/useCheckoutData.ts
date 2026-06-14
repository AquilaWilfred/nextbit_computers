import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { CartService } from "@/lib/services/checkout/cart.service";
import { AddressService } from "@/lib/services/checkout/address.service";
import { SettingsService } from "@/lib/services/checkout/settings.service";
import { CartItem, PublicSettings, SavedAddress } from "@/types/checkout/checkout.types";
import { DEFAULT_SHIPPING_FORM, AVAILABLE_PAYMENT_METHODS } from "@/constants/checkout/checkout.constants";

const CACHE_KEY = "checkout_cart_cache";
const CACHE_TTL = 2 * 60 * 1000;

function readCache(): CartItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { items, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return items;
  } catch { return null; }
}

function writeCache(items: CartItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
  } catch {}
}

export function useCheckoutData() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const cached = isAuthenticated ? readCache() : null;

  const [cartItems, setCartItems] = useState<CartItem[]>(cached ?? []);
  const [cartLoading, setCartLoading] = useState(isAuthenticated && !cached);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({});
  const [shipping, setShipping] = useState(DEFAULT_SHIPPING_FORM);
  const [isExpress, setIsExpress] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchCart = useCallback(async (silent = false): Promise<CartItem[]> => {
    if (isFetchingRef.current) return cartItems;
    isFetchingRef.current = true;
    if (!silent) setCartLoading(true);
    try {
      const items = await CartService.fetchCart(isAuthenticated);
      setCartItems(items);
      writeCache(items);
      return items;
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      return [];
    } finally {
      isFetchingRef.current = false;
      if (!silent) setCartLoading(false);
    }
  }, [isAuthenticated]);

  const fetchAddresses = useCallback(async () => {
    try {
      const addresses = await AddressService.fetchAddresses(isAuthenticated);
      setSavedAddresses(addresses);
    } catch {}
  }, [isAuthenticated]);

  const fetchSettings = useCallback(async () => {
    try {
      const publicSettings = await SettingsService.fetchPublicSettings();
      setSettings(publicSettings);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart(!!cached);
      fetchAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const parts = (user.name || "").trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || parts[0] || "";

    setShipping((prev) => {
      const updates: Partial<typeof prev> = {};
      if (!prev.firstName && firstName) updates.firstName = firstName;
      if (!prev.lastName && lastName) updates.lastName = lastName;
      if (!prev.email && user.email) updates.email = user.email;
      if (!prev.phone && user.phone) updates.phone = user.phone;
      return Object.keys(updates).length ? { ...prev, ...updates } : prev;
    });
  }, [isAuthenticated, user]);

  const activePaymentMethods = settings?.payment_methods || {
    mpesa: true,
    paypal: true,
    stripe: true,
  };

  const availableMethods = AVAILABLE_PAYMENT_METHODS.filter(
    (m) => activePaymentMethods[m.id] !== false
  );

  const freeThreshold = settings?.shipping?.freeShippingThreshold
    ? parseFloat(settings.shipping.freeShippingThreshold)
    : 50000;
  const standardFee = settings?.shipping?.standardFee
    ? parseFloat(settings.shipping.standardFee)
    : 1;
  const expressFee = settings?.shipping?.expressDelivery
    ? parseFloat(settings.shipping.expressDelivery)
    : 100;

  const subtotal = cartItems.reduce(
    (s, i) => s + parseFloat(i.product.price) * i.quantity,
    0
  );

  return {
    cartItems,
    cartLoading,
    savedAddresses,
    settings,
    shipping,
    isExpress,
    authLoading,
    isAuthenticated,
    setShipping,
    setIsExpress,
    activePaymentMethods,
    availableMethods,
    freeThreshold,
    standardFee,
    expressFee,
    subtotal,
    fetchCart,
    fetchAddresses,
  };
}