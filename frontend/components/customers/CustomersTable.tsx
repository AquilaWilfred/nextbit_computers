"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Customer, SortConfig } from "@/types/customers.types";
import { SortHeader } from "./SortHeader";
import { CustomerRow } from "./CustomerRow";
import { SORTABLE_COLUMNS } from "@/constants/customers.constant";

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  sortConfig: SortConfig;
  onSort: (column: keyof Customer) => void;
  onViewCustomer: (customer: Customer) => void;
  paginatedCustomers: Customer[];
}

export const CustomersTable = memo(function CustomersTable({
  customers,
  isLoading,
  sortConfig,
  onSort,
  onViewCustomer,
  paginatedCustomers,
}: CustomersTableProps) {
  return (
    <Card className="p-6">
      <div className="overflow-x-auto" role="region" aria-label="Customers table">
        <table className="w-full text-sm" aria-label="Customers">
          <thead className="border-b border-border">
            <tr>
              {SORTABLE_COLUMNS.map(({ key, label }) => (
                <SortHeader key={key} label={label} column={key} sortConfig={sortConfig} onSort={onSort} />
              ))}
              <th scope="col" className="text-center py-3 px-4 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                  <Loader2 className="mx-auto animate-spin mb-2" />
                  Loading customers…
                </td>
              </tr>
            ) : paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} onView={onViewCustomer} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
});