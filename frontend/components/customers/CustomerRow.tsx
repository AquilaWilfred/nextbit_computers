"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Customer } from "@/types/customers.types";
import { formatDate, getRoleBadgeClass } from "@/lib/utils/customer.utils";

interface CustomerRowProps {
  customer: Customer;
  onView: (customer: Customer) => void;
}

export const CustomerRow = memo(function CustomerRow({ customer, onView }: CustomerRowProps) {
  return (
    <tr className="border-b border-border hover:bg-secondary transition-colors">
      <td className="py-3 px-4 font-medium">{customer.name || "—"}</td>
      <td className="py-3 px-4 text-muted-foreground">{customer.email}</td>
      <td className="py-3 px-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(customer.role)}`}>
          {customer.role}
        </span>
      </td>
      <td className="py-3 px-4">{formatDate(customer.createdAt)}</td>
      <td className="py-3 px-4">{formatDate(customer.lastSignedIn)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(customer)}
            aria-label={`View profile for ${customer.name ?? customer.email}`}
          >
            <Eye size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
});