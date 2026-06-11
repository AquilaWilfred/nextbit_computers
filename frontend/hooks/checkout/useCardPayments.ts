import { useState } from "react";
import { CheckoutService } from "@/lib/services/checkout/checkout.service";
import { toast } from "sonner";

interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  firstName: string;
  lastName: string;
}

export function useCardPayment(orderId: number, amount: number, onSuccess: () => void) {
  const [cardData, setCardData] = useState<CardData>({
    number: "",
    expiry: "",
    cvv: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);

  const processPayment = async () => {
    if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.firstName || !cardData.lastName) {
      toast.error("Please fill in all card details");
      return;
    }

    setLoading(true);
    try {
      await CheckoutService.processCardPayment(orderId, cardData);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCardData = (updates: Partial<CardData>) => {
    setCardData((prev) => ({ ...prev, ...updates }));
  };

  const formatCardNumber = (val: string) =>
    val
      .replace(/\D/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim()
      .slice(0, 19);

  const formatExpiry = (val: string) =>
    val
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1/$2")
      .slice(0, 5);

  return {
    cardData,
    loading,
    updateCardData,
    processPayment,
    formatCardNumber,
    formatExpiry,
  };
}