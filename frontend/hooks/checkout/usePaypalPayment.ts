import { useState, useEffect } from "react";
import { CheckoutService } from "@/lib/services/checkout/checkout.service";
import { toast } from "sonner";

export function usePaypalPayment(orderId: number, onSuccess: () => void) {
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initiatePayment = async () => {
    const popup = window.open("", "PayPal", "width=500,height=750");
    if (popup) {
      popup.document.write(
        "<h3 style='font-family:sans-serif; text-align:center; margin-top:40px; color:#666;'>Securely connecting to PayPal...</h3>"
      );
    }
    
    setLoading(true);
    try {
      const data = await CheckoutService.initiatePaypal(orderId);
      setPaypalOrderId(data.paypalOrderId);
      if (data.approvalUrl) {
        setPaypalUrl(data.approvalUrl);
        if (popup) popup.location.href = data.approvalUrl;
      } else {
        if (popup) popup.close();
        toast.error("Could not obtain PayPal checkout link");
        setPaypalOrderId(null);
      }
      toast.success(data.message);
    } catch (err: any) {
      if (popup) popup.close();
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (pOrderId: string) => {
    setLoading(true);
    try {
      await CheckoutService.confirmPaypal(orderId, pOrderId);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = () => {
    setPaypalOrderId(null);
    setPaypalUrl(null);
  };

  // PayPal popup message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "PAYPAL_SUCCESS" &&
        event.data.orderId === orderId.toString()
      ) {
        confirmPayment(event.data.token);
      } else if (event.data?.type === "PAYPAL_CANCEL") {
        cancelPayment();
        toast.error("PayPal checkout was cancelled");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [orderId]);

  return {
    paypalOrderId,
    paypalUrl,
    loading,
    initiatePayment,
    confirmPayment,
    cancelPayment,
  };
}