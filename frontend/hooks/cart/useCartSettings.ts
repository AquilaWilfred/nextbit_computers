import { useState, useEffect } from "react";
import { settingsService } from "@/lib/services/cart/settings.service";
import { PublicSettings, CartTotals } from "@/types/cart/cart.types";
import { DEFAULT_FREE_THRESHOLD, DEFAULT_STANDARD_FEE } from "@/constants/cart/cart.constants";

export function useCartSettings(items: { price: number; quantity: number }[]) {
  const [settings, setSettings] = useState<PublicSettings>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await settingsService.getPublicSettings();
      setSettings(data);
    };
    fetchSettings();
  }, []);

  const freeThreshold = settings?.shipping?.freeShippingThreshold
    ? parseFloat(settings.shipping.freeShippingThreshold)
    : DEFAULT_FREE_THRESHOLD;
  const standardFee = settings?.shipping?.standardFee
    ? parseFloat(settings.shipping.standardFee)
    : DEFAULT_STANDARD_FEE;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = items.length > 0 && subtotal < freeThreshold ? standardFee : 0;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = Math.max(0, freeThreshold - subtotal);

  const totals: CartTotals = {
    subtotal,
    shippingCost,
    total,
    freeThreshold,
    standardFee,
    remainingForFreeShipping,
  };

  return { settings, totals };
}