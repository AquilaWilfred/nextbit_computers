"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Customer } from "@/types/customers.types";

interface CustomerStatsProps {
  customers: Customer[];
}

export const CustomerStats = memo(function CustomerStats({ customers }: CustomerStatsProps) {
  const activeCount = customers.filter((c) => c.role !== "admin").length;
  const adminCount = customers.filter((c) => c.role === "admin").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Customer summary statistics">
      <Card className="p-6">
        <p className="text-sm text-muted-foreground font-medium">Total Customers</p>
        <p className="text-3xl font-bold mt-2">{customers.length}</p>
      </Card>
      <Card className="p-6">
        <p className="text-sm text-muted-foreground font-medium">Active Customers</p>
        <p className="text-3xl font-bold mt-2">{activeCount}</p>
      </Card>
      <Card className="p-6">
        <p className="text-sm text-muted-foreground font-medium">Admins</p>
        <p className="text-3xl font-bold mt-2">{adminCount}</p>
      </Card>
    </div>
  );
});