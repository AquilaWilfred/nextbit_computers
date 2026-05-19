"use client";

import { memo } from "react";

export const OrdersHeader = memo(function OrdersHeader() {
  return (
    <div>
      <h2 className="text-3xl font-bold">Orders Management</h2>
      <p className="text-muted-foreground mt-1">View and manage all customer orders</p>
    </div>
  );
});