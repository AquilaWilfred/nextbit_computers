import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Branch } from "@/types/network/stores/man.types";

export function useFederationToggle(onSuccess: (branchId: string, enabled: boolean) => void) {
  const [toggling, setToggling] = useState<string | null>(null);

  const toggleFederation = useCallback(async (branch: Branch) => {
    setToggling(branch.id);
    try {
      const res = await fetch(`/api/admin/network/stores/${branch.id}/federation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !branch.federationEnabled }),
      });
      
      if (!res.ok) throw new Error();
      
      onSuccess(branch.id, !branch.federationEnabled);
      toast.success(
        `Federation ${!branch.federationEnabled ? "enabled" : "disabled"} for ${branch.name}`
      );
    } catch {
      toast.error("Failed to update federation status");
    } finally {
      setToggling(null);
    }
  }, [onSuccess]);

  return { toggling, toggleFederation };
}