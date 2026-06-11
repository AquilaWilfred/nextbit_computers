import { useState, useRef } from "react";
import { CheckoutService } from "@/lib/services/checkout/checkout.service";
import { toast } from "sonner";

export function useMpesaPayment(
  orderId: number,
  amount: number,
  onSuccess: () => void,
  initialPhone?: string,
  sellerId?: string | null
) {
  const [mpesaPhone, setMpesaPhone] = useState(initialPhone ?? "");
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState<string | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastCheckedState = useRef<string | null>(null);

  const initiatePayment = async (phone: string) => {
    setLoading(true);
    try {
      const { formatPhoneNumber, validatePhoneNumber } = await import(
        "@/lib/utils/pay.utils"
      );

      if (!validatePhoneNumber(phone)) {
        throw new Error("Invalid phone number. Use format: +254XXXXXXXXX");
      }

      const response = await CheckoutService.initiateMpesa(
        orderId,
        amount,
        formatPhoneNumber(phone),
        sellerId
      );

      const createdEscrowId = response.id ?? response.escrow_id ?? null;
      if (!createdEscrowId) {
        throw new Error("Failed to initialize escrow. Please contact support.");
      }

      setEscrowId(createdEscrowId);
      setMpesaCheckoutId(response.checkout_request_id ?? response.id ?? null);
      toast.success(
        "STK push sent! Please check your phone and complete the payment."
      );

      // Poll for payment status
      const pollInterval = setInterval(async () => {
        try {
          const escrow = await CheckoutService.verifyMpesa(createdEscrowId);
          if (escrow?.state === "funds_held_in_escrow") {
            clearInterval(pollInterval);
            onSuccess();
          } else if (
            escrow?.state === "created" &&
            lastCheckedState.current === "payment_pending"
          ) {
            clearInterval(pollInterval);
            toast.error("Payment was cancelled or failed. Please try again.");
            setMpesaCheckoutId(null);
          }
          if (escrow) lastCheckedState.current = escrow.state;
        } catch {
          // Continue polling on error
        }
      }, 5000);

      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate M-Pesa payment");
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = () => {
    setMpesaCheckoutId(null);
  };

  return {
    mpesaPhone,
    setMpesaPhone,
    mpesaCheckoutId,
    loading,
    initiatePayment,
    cancelPayment,
  };
}