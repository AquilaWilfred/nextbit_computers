"use client";

import { memo } from "react";
import { Order } from "@/types/orders.types";
import { OrderActionButtons } from "./OrderActionButtons";
import { formatDate, formatStatus } from "@/lib/utils/order.utils";
import { formatPrice } from "@/lib/cart";

interface OrderRowProps {
  order: Order;
  isUpdating: boolean;
  onView: () => void;
  onInvoice: () => void;
  onTracking: () => void;
}

export const OrderRow = memo(function OrderRow({
  order,
  isUpdating,
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
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          {formatStatus(order.status)}
        </span>
      </td>
      <td className="py-3 px-4 text-right font-semibold">{formatPrice(order.total)}</td>
      <td className="py-3 px-4">
        <OrderActionButtons order={order} onView={onView} onInvoice={onInvoice} onTracking={onTracking} />
      </td>
    </tr>
  );
});