import { TabOption, StoreStatus } from "@/types/network/stores/man.types";

export const TABS: TabOption[] = [
  { key: "all", label: "All Stores" },
  { key: "active", label: "In Network" },
  { key: "pending", label: "Pending" },
  { key: "inactive", label: "Not Joined" },
];

export const STATUS_BADGE_STYLES: Record<StoreStatus, string> = {
  active: "bg-green-500/15 text-green-700 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export const STATUS_LABELS: Record<StoreStatus, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
};