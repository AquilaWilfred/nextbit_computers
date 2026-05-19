"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Order } from "@/types/dashboard.types";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/lib/utils/dashboard.utils";

interface RecentOrdersTableProps {
  orders: Order[];
}

export const RecentOrdersTable = memo(function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const formatPrice = (price: number) => `KES ${price.toLocaleString()}`;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        <Link href="/admin/orders">
          <Button variant="outline" size="sm">View All Orders</Button>
        </Link>
      </div>

      <div className="overflow-x-auto" role="region" aria-label="Recent orders table">
        <table className="w-full text-sm" aria-label="Recent orders">
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="text-left py-3 px-4 font-semibold">Order ID</th>
              <th scope="col" className="text-left py-3 px-4 font-semibold">Customer</th>
              <th scope="col" className="text-left py-3 px-4 font-semibold">Date</th>
              <th scope="col" className="text-left py-3 px-4 font-semibold">Status</th>
              <th scope="col" className="text-right py-3 px-4 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-secondary transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">{order.orderNumber}</td>
                  <td className="py-3 px-4">{order.shippingFullName}</td>
                  <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
                  <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 px-4 text-right font-semibold">{formatPrice(order.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                  No recent orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
});