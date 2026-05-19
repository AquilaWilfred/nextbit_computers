import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils/order.utils";
import { Order } from "@/types/orders.types";

export function useOrderActions(onSuccess: () => void) {
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [assigningDelivery, setAssigningDelivery] = useState(false);

  const updateStatus = useCallback(
    async (orderId: number, newStatus: string, extra?: { trackingNumber?: string; note?: string }) => {
      setUpdatingOrderId(orderId);
      try {
        await apiFetch(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, ...extra }),
        });
        toast.success("Order status updated");
        onSuccess();
      } catch (err: any) {
        toast.error(err.message || "Failed to update order status");
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [onSuccess]
  );

  const assignDelivery = useCallback(
    async (orderId: number, agentId: number) => {
      setAssigningDelivery(true);
      try {
        await apiFetch(`/api/delivery/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, agentId }),
        });
        toast.success("Delivery assigned and customer notified!");
        onSuccess();
        return true;
      } catch (err: any) {
        toast.error(err.message || "Failed to assign delivery");
        return false;
      } finally {
        setAssigningDelivery(false);
      }
    },
    [onSuccess]
  );

  const updateTracking = useCallback(
    async (order: Order) => {
      const newTracking = window.prompt("Enter or update Tracking Number:", order.trackingNumber || "");
      if (newTracking !== null && newTracking !== (order.trackingNumber || "")) {
        await updateStatus(order.id, order.status, {
          trackingNumber: newTracking,
          note: `Tracking number updated to ${newTracking}`,
        });
      }
    },
    [updateStatus]
  );

  return {
    updatingOrderId,
    assigningDelivery,
    updateStatus,
    assignDelivery,
    updateTracking,
  };
}