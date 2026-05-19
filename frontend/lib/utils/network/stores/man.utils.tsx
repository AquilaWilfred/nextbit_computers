import { Branch, Tab } from "@/types/network/stores/man.types";

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatStockUnits(units: number): string {
  return units.toLocaleString();
}

export function formatPendingTransfers(count: number): string {
  return `${count} pending transfer${count !== 1 ? "s" : ""}`;
}

export function formatConflictFlags(count: number): string {
  return `${count} conflict${count > 1 ? "s" : ""}`;
}

export function filterStores(branches: Branch[], tab: Tab, search: string): Branch[] {
  return branches.filter((branch) => {
    const matchesTab =
      tab === "all" ||
      (tab === "active" && branch.federationEnabled && branch.status === "active") ||
      (tab === "pending" && branch.status === "pending") ||
      (tab === "inactive" && (!branch.federationEnabled || branch.status === "inactive"));
    
    const matchesSearch =
      !search ||
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.location.toLowerCase().includes(search.toLowerCase());
    
    return matchesTab && matchesSearch;
  });
}