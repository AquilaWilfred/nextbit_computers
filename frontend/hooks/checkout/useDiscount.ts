import { useState } from "react";
import { toast } from "sonner";

export function useDiscount(subtotal: number) {
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
  } | null>(null);

  const applyDiscount = () => {
    if (discountCode === "WELCOME10") {
      setAppliedDiscount({
        code: "WELCOME10",
        amount: subtotal * 0.1,
      });
      toast.success("Discount applied!");
    } else {
      toast.error("Invalid or expired discount code");
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    toast.info("Discount removed");
  };

  const discountAmount = appliedDiscount?.amount || 0;

  return {
    discountCode,
    appliedDiscount,
    discountAmount,
    setDiscountCode,
    applyDiscount,
    removeDiscount,
  };
}