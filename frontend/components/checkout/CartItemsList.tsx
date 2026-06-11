import { formatPrice } from "@/lib/cart";
import { CartItem } from "@/types/checkout/checkout.types";

interface CartItemsListProps {
  items: CartItem[];
}

export function CartItemsList({ items }: CartItemsListProps) {
  return (
    <div className="space-y-3 mb-5">
      {items.map((item) => {
        const images = (item.product.images as string[]) ?? [];
        return (
          <div key={item.productId} className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
              <img
                src={images[0] ?? "/assets/placeholder.png"}
                alt={item.product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.product.name}</p>
              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold shrink-0">
              {formatPrice(parseFloat(item.product.price) * item.quantity)}
            </p>
          </div>
        );
      })}
    </div>
  );
}