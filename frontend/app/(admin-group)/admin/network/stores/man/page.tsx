"use client";

import { StoresHeader } from "@/components/network/stores/man/StoresHeader";
import { StoresFilterBar } from "@/components/network/stores/man/StoresFilterBar";
import { StoreCard } from "@/components/network/stores/man/StoreCard";
import { StoresSkeleton } from "@/components/network/stores/man/StoresSkeleton";
import { EmptyState } from "@/components/network/stores/man/EmptyState";
import { AdminNote } from "@/components/network/stores/man/AdminNote";
import { useNetworkStores } from "@/hooks/network/stores/useNetworkStores";
import { useStoreFilter } from "@/hooks/network/stores/useStoreFilter";
import { useFederationToggle } from "@/hooks/network/stores/useFederationToggle";
import { Branch } from "@/types/network/stores/man.types";

export default function NetworkStoresPage() {
  const { branches, loading, fetchBranches, updateBranchFederation } = useNetworkStores();
  const { tab, setTab, search, setSearch, filteredStores } = useStoreFilter(branches);
  const { toggling, toggleFederation } = useFederationToggle(updateBranchFederation);

  const handleToggle = (branch: Branch) => {
    toggleFederation(branch);
  };

  return (
    <div>
      <StoresHeader onRefresh={fetchBranches} />

      <StoresFilterBar
        activeTab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <StoresSkeleton />
      ) : filteredStores.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredStores.map((branch) => (
            <StoreCard
              key={branch.id}
              branch={branch}
              isToggling={toggling === branch.id}
              onToggleFederation={() => handleToggle(branch)}
            />
          ))}
        </div>
      )}

      <AdminNote />
    </div>
  );
}