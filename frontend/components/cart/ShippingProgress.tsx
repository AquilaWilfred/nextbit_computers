import { formatPrice } from "@/lib/cart";

interface ShippingProgressProps {
  subtotal: number;
  freeThreshold: number;
  remainingForFreeShipping: number;
}

export function ShippingProgress({ subtotal, freeThreshold, remainingForFreeShipping }: ShippingProgressProps) {
  if (subtotal >= freeThreshold || subtotal === 0) return null;

  return (
    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
      Add {formatPrice(remainingForFreeShipping)} more for free shipping!
    </p>
  );
}