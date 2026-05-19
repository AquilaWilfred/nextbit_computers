import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Branch } from "@/types/branches.types";
import { apiFetch } from "@/lib/utils/branchUtilApis";

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Branch[]>("/api/admin/branches");
      setBranches(data);
    } catch (error: any) {
      toast.error(`Failed to load branches: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const deleteBranch = useCallback(async (id: number) => {
    if (!confirm("Delete this branch?")) return;
    
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/branches/${id}`, { method: "DELETE" });
      toast.success("Branch deleted");
      setBranches(prev => prev.filter(b => b.id !== id));
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    } finally {
      setDeletingId(null);
    }
  }, []);

  return {
    branches,
    loading,
    deletingId,
    fetchBranches,
    deleteBranch,
    setBranches,
  };
}