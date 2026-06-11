"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { clearGuestCart } from "@/lib/cart";

import {
  StepIndicator,
  ShippingForm,
  OrderReview,
  OrderSummary,
  PaymentStep,
  SavedAddressesList,
  CheckoutSkeleton,
  EmptyCart,
} from "@/components/checkout";

import { useCheckoutData } from "@/hooks/checkout/useCheckoutData";
import { useCheckoutForm } from "@/hooks/checkout/useCheckoutForm";
import { useDiscount } from "@/hooks/checkout/useDiscount";
import { usePaymentProcessing } from "@/hooks/checkout/usePaymentProcessing";
import { useAddresses } from "@/hooks/checkout/useAddresses";
import { calculateOrderTotals } from "@/lib/utils/checkout/checkout.utils";
import { PaymentMethod } from "@/types/checkout/checkout.types";

export default function CheckoutPage() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [sellerId, setSellerId] = useState<string | null | undefined>(undefined);

  // Data fetching
  const {
    cartItems,
    cartLoading,
    savedAddresses,
    shipping,
    isExpress,
    authLoading,
    isAuthenticated,
    availableMethods,
    freeThreshold,
    standardFee,
    expressFee,
    subtotal,
    setShipping,
    setIsExpress,
    fetchCart,
  } = useCheckoutData();

  // Form state
  const {
    step,
    placingOrder,
    orderId,
    orderNumber,
    setPlacingOrder,
    handleShippingSubmit,
    goToShipping,
    goToPayment,
    goToReview,
  } = useCheckoutForm(shipping, isAuthenticated, () => {});

  // Discount
  const { discountCode, appliedDiscount, discountAmount, setDiscountCode, applyDiscount, removeDiscount } =
    useDiscount(subtotal);

  // Calculate totals
  const { shippingCost, total } = calculateOrderTotals(
    subtotal,
    isExpress,
    freeThreshold,
    standardFee,
    expressFee,
    discountAmount
  );

  // Payment processing
  const { handlePlaceOrder } = usePaymentProcessing(
    isAuthenticated,
    cartItems,
    shipping,
    paymentMethod,
    isExpress,
    appliedDiscount,
    (id, number, sellerId) => {
      setSellerId(sellerId);
      goToPayment(id, number);
    },
    fetchCart
  );

  // Address helpers
  const { loadAddress } = useAddresses();

  // Loading state
  if (authLoading || cartLoading) {
    return <CheckoutSkeleton />;
  }

  // Empty cart
  if (isAuthenticated && cartItems.length === 0 && !cartLoading) {
    return <EmptyCart />;
  }

  // Handle payment success
  const handlePaymentSuccess = () => {
    clearGuestCart();
    router.push(`/order-confirmation/${orderNumber}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container py-8 flex-1">
        <StepIndicator currentStep={step} />

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === "shipping" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[var(--brand)]" /> Shipping Information
                </h2>

                <SavedAddressesList
                  addresses={savedAddresses}
                  onSelectAddress={(addr) => loadAddress(addr, setShipping)}
                />

                <ShippingForm
                  shipping={shipping}
                  isAuthenticated={isAuthenticated}
                  onSubmit={handleShippingSubmit}
                  onChange={(updates) => setShipping((prev) => ({ ...prev, ...updates }))}
                />
              </div>
            )}

            {step === "review" && (
              <OrderReview
                shipping={shipping}
                cartItems={cartItems}
                isExpress={isExpress}
                expressFee={expressFee}
                onToggleExpress={setIsExpress}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                availableMethods={availableMethods}
                onBack={goToShipping}
                onPlaceOrder={handlePlaceOrder}
                placingOrder={placingOrder}
              />
            )}

            {step === "payment" && orderId && orderNumber && (
            <PaymentStep
              orderId={orderId}
              orderNumber={orderNumber}
              paymentMethod={paymentMethod}
              total={total}
              shippingPhone={shipping.phone}
              sellerId={sellerId}
              onSuccess={handlePaymentSuccess}
            />
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary
              cartItems={cartItems}
              subtotal={subtotal}
              shippingCost={shippingCost}
              discountAmount={discountAmount}
              total={total}
              discountCode={discountCode}
              appliedDiscount={appliedDiscount}
              onDiscountCodeChange={setDiscountCode}
              onApplyDiscount={applyDiscount}
              onRemoveDiscount={removeDiscount}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}