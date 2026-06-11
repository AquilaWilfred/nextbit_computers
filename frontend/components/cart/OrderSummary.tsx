import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { CartTotals, PublicSettings } from "@/types/cart/cart.types";
import { ShippingProgress } from "./ShippingProgress";
import { DEFAULT_FEATURES } from "@/constants/cart/cart.constants";
import { getLoginUrl } from "@/lib/const";

interface OrderSummaryProps {
  totals: CartTotals;
  settings: PublicSettings;
  itemCount: number;
  isAuthenticated: boolean;
  onCheckout: () => void;
}

export function OrderSummary({ totals, settings, itemCount, isAuthenticated, onCheckout }: OrderSummaryProps) {
  const features = settings?.general?.features || DEFAULT_FEATURES;
  const displayFeatures = features.slice(0, 3).map((f: { title: string }) => f.title);

  // Update the free shipping feature text if threshold is available
  if (settings?.shipping?.freeShippingThreshold) {
    displayFeatures[1] = `Free shipping over ${formatPrice(totals.freeThreshold)}`;
  }

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-base">Order Summary</h2>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
            <span className="font-medium">{formatPrice(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className={totals.shippingCost === 0 ? "text-green-600 font-medium" : "font-medium"}>
              {totals.shippingCost === 0 ? "Free" : formatPrice(totals.shippingCost)}
            </span>
          </div>

          <ShippingProgress
            subtotal={totals.subtotal}
            freeThreshold={totals.freeThreshold}
            remainingForFreeShipping={totals.remainingForFreeShipping}
          />

          <div className="border-t border-border pt-2.5 flex justify-between font-display font-bold text-base">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>

        <Button
          onClick={onCheckout}
          className="w-full bg-[var(--brand)] text-white hover:opacity-90 gap-2"
          size="lg"
        >
          Proceed to Checkout <ArrowRight className="w-4 h-4" />
        </Button>

        {!isAuthenticated && (
          <p className="text-xs text-center text-muted-foreground">
            You'll need to{" "}
            <button
              onClick={() => (window.location.href = getLoginUrl("/checkout"))}
              className="text-[var(--brand)] hover:underline"
            >
              sign in
            </button>{" "}
            to complete your purchase.
          </p>
        )}

        <div className="pt-2 space-y-1.5">
          {displayFeatures.map((feature, idx) => (
            <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--brand)] shrink-0" />
              {feature}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}