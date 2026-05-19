import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useAICampaign() {
  const [isPending, setIsPending] = useState(false);

  const triggerCampaign = useCallback(async () => {
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/marketing/ai-campaign", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message ?? "Error");
      }
      const { sentCount } = await res.json();
      toast.success(`AI campaign sent to ${sentCount} customers!`);
      return sentCount;
    } catch (err: any) {
      toast.error(err.message);
      return 0;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { isPending, triggerCampaign };
}