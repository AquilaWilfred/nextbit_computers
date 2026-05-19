import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PaymentMethodsMap } from "@/types/pay.types";
import { DEFAULT_PAYMENT_METHODS } from "@/constants/pay.constants";
import { apiFetch } from "@/lib/utils/pay.utils";

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodsMap>(DEFAULT_PAYMENT_METHODS);
  const [toggling, setToggling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PaymentMethodsMap>("/api/admin/settings/payment_methods")
      .then(setMethods)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleMethod = useCallback(async (key: string, enabled: boolean) => {
    const updated = { ...methods, [key]: enabled };
    setMethods(updated); // optimistic update
    setToggling(key);
    
    try {
      await apiFetch("/api/admin/settings/payment_methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      toast.success("Payment method updated");
    } catch {
      setMethods(methods); // rollback
      toast.error("Failed to update setting");
    } finally {
      setToggling(null);
    }
  }, [methods]);

  return {
    methods,
    toggling,
    loading,
    toggleMethod,
  };
}