"use client";

import { memo } from "react";

export const PaymentsHeader = memo(function PaymentsHeader() {
  return (
    <div>
      <h2 className="text-3xl font-bold">Payments Management</h2>
      <p className="text-muted-foreground mt-1">Monitor and manage all financial transactions</p>
    </div>
  );
});