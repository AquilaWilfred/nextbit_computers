export type Customer = {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  lastSignedIn: string;
};

export type SortConfig = {
  key: keyof Customer;
  direction: "asc" | "desc";
} | null;