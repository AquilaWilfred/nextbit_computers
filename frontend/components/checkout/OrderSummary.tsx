import { formatPrice } from "@/lib/cart";
import { CartItem } from "@/types/checkout/checkout.types";
import { DiscountCodeInput } from "./DiscountCodeInput";

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  discountCode: string;
  appliedDiscount: { code: string; amount: number } | null;
  onDiscountCodeChange: (code: string) => void;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
}

export function OrderSummary({
  cartItems,
  subtotal,
  shippingCost,
  discountAmount,
  total,
  discountCode,
  appliedDiscount,
  onDiscountCodeChange,
  onApplyDiscount,
  onRemoveDiscount,
}: OrderSummaryProps) {
  return (
    <div className="sticky top-24 rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-display font-semibold text-sm">Order Summary</h3>
      <div className="space-y-2 text-sm">
        {cartItems.map((item) => (
          <div key={item.productId} className="flex justify-between">
            <span className="text-muted-foreground truncate mr-2">
              {item.product.name} ×{item.quantity}
            </span>
            <span className="font-medium shrink-0">
              {formatPrice(parseFloat(item.product.price) * item.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-2 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className={shippingCost === 0 ? "text-green-600" : ""}>
              {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
            </span>
          </div>
          {appliedDiscount && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Discount ({appliedDiscount.code})</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-bold text-base pt-1 border-t border-border">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <DiscountCodeInput
        discountCode={discountCode}
        appliedDiscount={appliedDiscount}
        onCodeChange={onDiscountCodeChange}
        onApply={onApplyDiscount}
        onRemove={onRemoveDiscount}
      />
    </div>
  );
}