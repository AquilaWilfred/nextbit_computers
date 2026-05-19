import { Customer } from "@/types/customers.types";

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_ITEMS_PER_PAGE = 20;

export const SORTABLE_COLUMNS: { key: keyof Customer; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "createdAt", label: "Joined" },
  { key: "lastSignedIn", label: "Last Seen" },
];