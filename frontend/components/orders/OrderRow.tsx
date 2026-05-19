"use client";

import { memo } from "react";
import { Order } from "@/types/orders.types";
import { OrderStatusSelect } from "./OrderStatusSelect";
import { OrderActionButtons } from "./OrderActionButtons";
import { formatDate } from "@/lib/utils/order.utils";
import { formatPrice } from "@/lib/cart";

interface OrderRowProps {
  order: Order;
  isUpdating: boolean;
  onStatusChange: (status: string) => void;
  onView: () => void;
  onInvoice: () => void;
  onTracking: () => void;
}

export const OrderRow = memo(function OrderRow({
  order,
  isUpdating,
  onStatusChange,
  onView,
  onInvoice,
  onTracking,
}: OrderRowProps) {
  return (
    <tr className="border-b border-border hover:bg-secondary transition-colors">
      <td className="py-3 px-4 font-mono text-xs">{order.orderNumber}</td>
      <td className="py-3 px-4">{order.shippingFullName}</td>
      <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
      <td className="py-3 px-4">
        <OrderStatusSelect value={order.status} onChange={onStatusChange} disabled={isUpdating} />
      </td>
      <td className="py-3 px-4 text-right font-semibold">{formatPrice(order.total)}</td>
      <td className="py-3 px-4">
        <OrderActionButtons order={order} onView={onView} onInvoice={onInvoice} onTracking={onTracking} />
      </td>
    </tr>
  );
});