import { useState } from "react";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { Address } from "@/types/dashboard/dashboard.types";
import { toast } from "sonner";

export function useAddressActions(onSuccess?: () => void) {
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createAddress = async (address: Omit<Address, 'id'>) => {
    setIsCreating(true);
    try {
      await dashboardService.createAddress(address);
      toast.success("Address saved!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save address");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const deleteAddress = async (addressId: number) => {
    setIsDeleting(true);
    try {
      await dashboardService.deleteAddress(addressId);
      toast.success("Address deleted");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete address");
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return { createAddress, deleteAddress, isCreating, isDeleting };
}