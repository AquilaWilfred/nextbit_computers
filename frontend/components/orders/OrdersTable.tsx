"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
import { Order, SortConfig } from "@/types/orders.types";
import { OrderRow } from "./OrderRow";
import { OrdersSkeleton } from "./OrdersSkeleton";

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  sortConfig: SortConfig;
  updatingOrderId: number | null;
  onSort: (key: string) => void;
  onStatusChange: (orderId: number, status: string) => void;
  onView: (order: Order) => void;
  onInvoice: (orderId: number) => void;
  onTracking: (order: Order) => void;
}

const SORTABLE_COLUMNS = [
  { key: "orderNumber", label: "Order ID" },
  { key: "shippingFullName", label: "Customer" },
  { key: "createdAt", label: "Date" },
  { key: "status", label: "Status" },
  { key: "total", label: "Total", right: true },
];

export const OrdersTable = memo(function OrdersTable({
  orders,
  isLoading,
  sortConfig,
  updatingOrderId,
  onSort,
  onStatusChange,
  onView,
  onInvoice,
  onTracking,
}: OrdersTableProps) {
  if (isLoading) {
    return <OrdersSkeleton />;
  }

  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              {SORTABLE_COLUMNS.map(({ key, label, right }) => (
                <th
                  key={key}
                  className={`${right ? "text-right" : "text-left"} py-3 px-4 font-semibold cursor-pointer hover:bg-muted/50 select-none`}
                  onClick={() => onSort(key)}
                >
                  <div className={`flex items-center ${right ? "justify-end" : ""} gap-1`}>
                    {label} <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </th>
              ))}
              <th className="text-center py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isUpdating={updatingOrderId === order.id}
                  onStatusChange={(status) => onStatusChange(order.id, status)}
                  onView={() => onView(order)}
                  onInvoice={() => onInvoice(order.id)}
                  onTracking={() => onTracking(order)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
});