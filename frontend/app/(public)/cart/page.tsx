"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShoppingCart } from "lucide-react";

import {
  CartItemsList,
  CartEmpty,
  CartSkeleton,
  OrderSummary,
} from "@/components/cart";

import { useCart } from "@/hooks/cart/useCart";
import { useCartActions } from "@/hooks/cart/useCartActions";
import { useCartSettings } from "@/hooks/cart/useCartSettings";

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const { items, isLoading, refreshAuthCart, refreshGuestCart } = useCart(isAuthenticated);
  const { updateQuantity, removeItem } = useCartActions(
    isAuthenticated,
    refreshAuthCart,
    refreshGuestCart
  );
  const { settings, totals } = useCartSettings(items);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push("/checkout/auth");
    } else {
      router.push("/checkout");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container py-8 flex-1">
        <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" /> Shopping Cart
          {items.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          )}
        </h1>

        {isLoading ? (
          <CartSkeleton />
        ) : items.length === 0 ? (
          <CartEmpty />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <CartItemsList items={items} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
            <OrderSummary
              totals={totals}
              settings={settings}
              itemCount={items.length}
              isAuthenticated={isAuthenticated}
              onCheckout={handleCheckout}
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}