export type StoreStatus = "active" | "pending" | "inactive";
export type Tab = "all" | "active" | "pending" | "inactive";

export interface Branch {
  id: string;
  name: string;
  location: string;
  federationEnabled: boolean;
  stockUnits: number;
  pendingTransfers: number;
  conflictFlags: number;
  status: StoreStatus;
  joinedNetwork?: string;
}

export interface TabOption {
  key: Tab;
  label: string;
}