import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils/pay.utils";

export function usePaymentActions(onSuccess: () => void) {
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [refunding, setRefunding] = useState(false);

  const approvePayout = useCallback(async (id: number) => {
    setApprovingId(id);
    try {
      await apiFetch(`/api/admin/payments/payout-requests/${id}/approve`, { method: "POST" });
      toast.success("Payout approved successfully");
      onSuccess();
      return true;
    } catch (err: any) {
      toast.error("Failed to approve: " + err.message);
      return false;
    } finally {
      setApprovingId(null);
    }
  }, [onSuccess]);

  const rejectPayout = useCallback(async (id: number) => {
    setRejectingId(id);
    try {
      await apiFetch(`/api/admin/payments/payout-requests/${id}/reject`, { method: "POST" });
      toast.success("Payout rejected");
      onSuccess();
      return true;
    } catch (err: any) {
      toast.error("Failed to reject: " + err.message);
      return false;
    } finally {
      setRejectingId(null);
    }
  }, [onSuccess]);

  const refundPayment = useCallback(async (orderId: number) => {
    setRefunding(true);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
      toast.success("Payment refunded successfully");
      onSuccess();
      return true;
    } catch (err: any) {
      toast.error("Failed to refund: " + err.message);
      return false;
    } finally {
      setRefunding(false);
    }
  }, [onSuccess]);

  return {
    approvingId,
    rejectingId,
    refunding,
    approvePayout,
    rejectPayout,
    refundPayment,
  };
}