import { useState } from "react";
import { ShippingFormData, Step } from "@/types/checkout/checkout.types";
import { validateShippingForm } from "@/lib/utils/checkout/checkout.utils";
import { toast } from "sonner";

export function useCheckoutForm(
  shipping: ShippingFormData,
  isAuthenticated: boolean,
  onSuccess: () => void
) {
  const [step, setStep] = useState<Step>("shipping");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateShippingForm(shipping, isAuthenticated)) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep("review");
  };

  const goToShipping = () => setStep("shipping");
  const goToPayment = (id: number, number: string) => {
    setOrderId(id);
    setOrderNumber(number);
    setStep("payment");
  };

  const goToReview = () => setStep("review");

  return {
    step,
    placingOrder,
    orderId,
    orderNumber,
    setPlacingOrder,
    handleShippingSubmit,
    goToShipping,
    goToPayment,
    goToReview,
  };
}