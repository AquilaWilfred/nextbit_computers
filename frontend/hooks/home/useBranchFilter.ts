// hooks/useBranchFilter.ts
import { useState, useMemo } from "react";
import { Branch } from "@/types/home.types";
import { getBranchStatusToday } from "@/lib/utils/homeHelpers";

export function useBranchFilter({ branches }: { branches: Branch[] | undefined }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((branch) => {
      const status = getBranchStatusToday(branch);
      if (statusFilter === "open" && status !== "open") return false;
      if (statusFilter === "closed" && status !== "closed") return false;
      return !q || `${branch.name} ${branch.address ?? ""}`.toLowerCase().includes(q);
    });
  }, [branches, searchQuery, statusFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBranches,
  };
}