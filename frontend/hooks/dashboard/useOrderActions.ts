import { useState } from "react";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { toast } from "sonner";

export function useOrderActions(onSuccess?: () => void) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const cancelOrder = async (orderId: number, reason: string) => {
    setIsCancelling(true);
    try {
      await dashboardService.cancelOrder(orderId, reason);
      toast.success("Order cancelled successfully.");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
      throw err;
    } finally {
      setIsCancelling(false);
    }
  };

  const reorder = async (items: { productId: number; quantity: number }[]) => {
    setIsReordering(true);
    try {
      await dashboardService.syncCart(items);
      toast.success("Items added to your cart!");
      window.location.href = "/cart";
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder items.");
      throw err;
    } finally {
      setIsReordering(false);
    }
  };

  return { cancelOrder, reorder, isCancelling, isReordering };
}