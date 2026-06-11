import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { CartItemDisplay } from "@/types/cart/cart.types";

interface CartItemProps {
  item: CartItemDisplay;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (itemId: number, productId: number) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const image = item.image ?? "/assets/placeholder.png";
  const price = item.price ?? 0;

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-[var(--brand)]/20 transition-colors">
      <Link href={`/products/${item.slug ?? ""}`}>
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          <img src={image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            {item.brand && (
              <p className="text-xs text-[var(--brand)] font-medium uppercase tracking-wide">
                {item.brand}
              </p>
            )}
            <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2">
              {item.name ?? `Product #${item.productId}`}
            </h3>
          </div>
          <button
            onClick={() => onRemove(item.id!, item.productId)}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Quantity */}
          <div className="flex items-center border border-input rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
              className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={item.quantity <= 1}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(item.productId, Math.min(item.stock || 99, item.quantity + 1))
              }
              className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!!(item.stock && item.quantity >= item.stock)}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="font-display font-bold">{formatPrice(price * item.quantity)}</p>
            <p className="text-xs text-muted-foreground">{formatPrice(price)} each</p>
          </div>
        </div>
      </div>
    </div>
  );
}