import { useCallback } from "react";
import { toast } from "sonner";
import { AppStatus, StatusChangeOptions } from "@/types/b2b.applications.types";

export function useApplicationStatus(onSuccess: () => void) {
  const updateStatus = useCallback(
    async (id: string, status: AppStatus, options?: StatusChangeOptions): Promise<void> => {
      try {
        const response = await fetch(`/api/admin/b2b/applications/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, ...options }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to update status");
        }

        // Success message based on status
        const successMessage = 
          status === "approved" ? "Application approved and activated" :
          status === "rejected" ? "Application rejected" :
          status === "under_review" ? "Application marked as under review" :
          status === "more_info_needed" ? "Additional information requested" :
          `Application status updated to ${status}`;

        toast.success(successMessage);
        
        // Refresh the list
        onSuccess();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update application";
        toast.error(errorMessage);
        throw error;
      }
    },
    [onSuccess]
  );

  return { updateStatus };
}