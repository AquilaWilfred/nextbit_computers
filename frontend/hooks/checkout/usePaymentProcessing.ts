import { useState } from "react";
import { CheckoutService } from "@/lib/services/checkout/checkout.service";
import { ShippingFormData, CartItem, PaymentMethod } from "@/types/checkout/checkout.types";
import { getGuestCart, clearGuestCart } from "@/lib/cart";
import { toast } from "sonner";

export function usePaymentProcessing(
  isAuthenticated: boolean,
  cartItems: CartItem[],
  shipping: ShippingFormData,
  paymentMethod: PaymentMethod,
  isExpress: boolean,
  appliedDiscount: { code: string; amount: number } | null,
  onSuccess: (orderId: number, orderNumber: string, sellerId?: string | null, escrowId?: string) => void,
  fetchCart: () => Promise<CartItem[]>
) {
  const [placingOrder, setPlacingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    try {
      const latestCartItems = isAuthenticated ? await fetchCart() : cartItems;

      const guestItems = !isAuthenticated
        ? getGuestCart().map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          }))
        : undefined;

      if (!isAuthenticated && (!guestItems || guestItems.length === 0)) {
        toast.error("Your cart is empty. Add items before placing an order.");
        return;
      }

      const items = latestCartItems.length
        ? latestCartItems.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          }))
        : guestItems;

      const requestBody = {
        items,
        shippingFullName: `${shipping.firstName} ${shipping.lastName}`.trim(),
        shippingPhone: shipping.phone,
        shippingAdditionalPhone1: shipping.additionalPhone1 || undefined,
        shippingAdditionalPhone2: shipping.additionalPhone2 || undefined,
        deliveryNote: shipping.deliveryNote || undefined,
        shippingAddress: shipping.address,
        shippingCounty: shipping.country === "Kenya" ? shipping.county : undefined,
        shippingCity: shipping.city,
        shippingPostalCode: shipping.postalCode || undefined,
        shippingCountry: shipping.country,
        shippingEmail: isAuthenticated ? undefined : shipping.email,
        deliveryLat: shipping.deliveryLat,
        deliveryLng: shipping.deliveryLng,
        deliveryAddress: shipping.deliveryAddress,
        paymentMethod,
        isExpress,
        discountCode: appliedDiscount?.code,
        saveAddress: shipping.saveAddress,
      };

      const { orderId, orderNumber, sellerId, escrowId } = await CheckoutService.placeOrder(requestBody);
      onSuccess(orderId, orderNumber, sellerId, escrowId);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  return {
    placingOrder,
    handlePlaceOrder,
  };
}