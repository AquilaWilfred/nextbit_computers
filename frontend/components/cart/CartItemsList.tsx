import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItemDisplay } from "@/types/cart/cart.types";
import { CartItem } from "./CartItem";

interface CartItemsListProps {
  items: CartItemDisplay[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (itemId: number, productId: number) => void;
}

export function CartItemsList({ items, onUpdateQuantity, onRemove }: CartItemsListProps) {
  return (
    <div className="lg:col-span-2 space-y-3">
      {items.map((item) => (
        <CartItem
          key={item.productId}
          item={item}
          onUpdateQuantity={onUpdateQuantity}
          onRemove={onRemove}
        />
      ))}

      <div className="flex justify-between pt-2">
        <Link href="/products">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}