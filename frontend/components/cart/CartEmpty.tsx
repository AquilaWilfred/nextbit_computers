import Link from "next/link";
import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CartEmpty() {
  return (
    <div className="text-center py-20">
      <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
      <h2 className="font-display text-xl font-semibold mb-2">Your cart is empty</h2>
      <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
      <Link href="/products">
        <Button className="bg-[var(--brand)] text-white hover:opacity-90 gap-2">
          <Package className="w-4 h-4" /> Browse Products
        </Button>
      </Link>
    </div>
  );
}