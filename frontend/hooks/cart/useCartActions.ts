import { useCallback } from "react";
import { cartService } from "@/lib/services/cart/cart.service";
import { updateGuestCartItem, removeFromGuestCart } from "@/lib/cart";
import { toast } from "sonner";

export function useCartActions(
  isAuthenticated: boolean,
  onAuthCartChange: () => void,
  onGuestCartChange: () => void
) {
  const updateQuantity = useCallback(async (productId: number, quantity: number) => {
    if (isAuthenticated) {
      try {
        await cartService.upsertCartItem(productId, quantity);
        onAuthCartChange();
      } catch {
        toast.error("Failed to update cart");
      }
    } else {
      updateGuestCartItem(productId, quantity);
      onGuestCartChange();
      window.dispatchEvent(new Event("guestCartUpdated"));
    }
  }, [isAuthenticated, onAuthCartChange, onGuestCartChange]);

  const removeItem = useCallback(async (itemId: number, productId: number) => {
    if (isAuthenticated) {
      try {
        await cartService.removeCartItem(itemId);
        onAuthCartChange();
        toast.success("Item removed");
      } catch {
        toast.error("Failed to remove item");
      }
    } else {
      removeFromGuestCart(productId);
      onGuestCartChange();
      window.dispatchEvent(new Event("guestCartUpdated"));
      toast.success("Item removed");
    }
  }, [isAuthenticated, onAuthCartChange, onGuestCartChange]);

  return { updateQuantity, removeItem };
}