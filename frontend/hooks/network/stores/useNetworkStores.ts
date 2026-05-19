import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Branch } from "@/types/network/stores/man.types";

export function useNetworkStores() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/network/stores");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const updateBranchFederation = useCallback((branchId: string, enabled: boolean) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId ? { ...b, federationEnabled: enabled } : b
      )
    );
  }, []);

  return {
    branches,
    loading,
    fetchBranches,
    updateBranchFederation,
  };
}