import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, Truck, ChevronRight, Loader2, Package } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { ShippingFormData, CartItem, PaymentMethod } from "@/types/checkout/checkout.types";
import { CartItemsList } from "./CartItemsList";
import { AVAILABLE_PAYMENT_METHODS } from "@/constants/checkout/checkout.constants";

interface OrderReviewProps {
  shipping: ShippingFormData;
  cartItems: CartItem[];
  isExpress: boolean;
  expressFee: number;
  onToggleExpress: (value: boolean) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  availableMethods: typeof AVAILABLE_PAYMENT_METHODS;
  onBack: () => void;
  onPlaceOrder: () => void;
  placingOrder: boolean;
}

export function OrderReview({
  shipping,
  cartItems,
  isExpress,
  expressFee,
  onToggleExpress,
  paymentMethod,
  onPaymentMethodChange,
  availableMethods,
  onBack,
  onPlaceOrder,
  placingOrder,
}: OrderReviewProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
        <Package className="w-5 h-5 text-[var(--brand)]" /> Order Review
      </h2>

      {/* Shipping summary */}
      <div className="bg-muted/40 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Shipping To</p>
          <button onClick={onBack} className="text-xs text-[var(--brand)] hover:underline">
            Edit
          </button>
        </div>
        <p className="text-sm">
          {shipping.firstName} {shipping.lastName}
        </p>
        <p className="text-sm text-muted-foreground">
          {shipping.address}, {shipping.city}
          {shipping.postalCode ? `, ${shipping.postalCode}` : ""}, {shipping.country}
        </p>
        <p className="text-sm text-muted-foreground">{shipping.phone}</p>
      </div>

      <CartItemsList items={cartItems} />

      {/* Express Delivery Toggle */}
      <div className="mb-6 p-4 border border-[var(--brand)]/30 rounded-xl bg-[var(--brand)]/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <div>
            <p className="font-semibold text-sm">Express Delivery</p>
            <p className="text-xs text-muted-foreground">
              Get your order faster for {formatPrice(expressFee)}
            </p>
          </div>
        </div>
        <Switch checked={isExpress} onCheckedChange={onToggleExpress} />
      </div>

      {/* Payment method selection */}
      <div className="mb-5">
        <p className="text-sm font-semibold mb-3">Select Payment Method</p>
        <div className="grid gap-2">
          {availableMethods.map((method) => (
            <label
              key={method.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                paymentMethod === method.id
                  ? "border-[var(--brand)] bg-[var(--brand)]/5"
                  : "border-border hover:border-[var(--brand)]/30"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={method.id}
                checked={paymentMethod === method.id}
                onChange={() => onPaymentMethodChange(method.id)}
                className="sr-only"
              />
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  paymentMethod === method.id ? "bg-[var(--brand)]/10" : "bg-muted"
                }`}
              >
                <method.icon
                  className={`w-4 h-4 ${
                    paymentMethod === method.id ? "text-[var(--brand)]" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.sub}</p>
              </div>
              {paymentMethod === method.id && (
                <Check className="w-4 h-4 text-[var(--brand)] ml-auto" />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onPlaceOrder}
          disabled={placingOrder}
          className="flex-1 bg-[var(--brand)] text-white hover:opacity-90 gap-2"
        >
          {placingOrder ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Placing Order...
            </>
          ) : (
            <>
              Place Order <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}