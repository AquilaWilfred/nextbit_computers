import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";
import {
  Order,
  OrderDetail as OrderDetailType,
  PublicSettings,
} from "@/types/dashboard/dashboard.types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetail } from "./OrderDetail";
import StoreLoader from "@/components/StoreLoader";

interface OrdersListProps {
  orders: Order[];
  isLoading: boolean;
  selectedOrderId?: number;
  orderDetail?: OrderDetailType | null;
  isDetailLoading?: boolean;
  settings: PublicSettings | null;
  isCancelling: boolean;
  isReordering: boolean;
  driverLocation: { lat: number; lng: number } | null;
  onReorder: () => void;
  onCancel: (reason: string) => void;
  onPrintReceipt: () => void;
  onOpenCancelModal: () => void;
  onCloseCancelModal: () => void;
  showCancelModal: boolean;
}

export function OrdersList({
  orders,
  isLoading,
  selectedOrderId,
  orderDetail,
  isDetailLoading,
  settings,
  isCancelling,
  isReordering,
  driverLocation,
  onReorder,
  onCancel,
  onPrintReceipt,
  onOpenCancelModal,
  onCloseCancelModal,
  showCancelModal,
}: OrdersListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden="true" />
        <p className="font-medium">No orders yet</p>
        <Link href="/products">
          <Button size="sm" className="mt-4 bg-[var(--brand)] text-white hover:opacity-90">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">My Orders</h1>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={selectedOrderId === order.id ? "/dashboard?tab=orders" : `/dashboard?tab=orders&orderId=${order.id}`}>
              <div className={`bg-card border rounded-xl p-4 transition-all ${selectedOrderId === order.id ? "border-[var(--brand)]/40 shadow-sm" : "border-border hover:border-[var(--brand)]/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono font-semibold text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{order.paymentMethod ?? "—"} payment</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{formatPrice(order.total)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-[var(--brand)]">
                  {selectedOrderId === order.id ? "View less" : "View Details"} <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </div>
              </div>
            </Link>

            {selectedOrderId === order.id && (
              <div className="mt-4">
                <OrderDetail
                  orderDetail={orderDetail}
                  settings={settings}
                  isLoading={isDetailLoading ?? false}
                  isCancelling={isCancelling}
                  isReordering={isReordering}
                  driverLocation={driverLocation}
                  onReorder={onReorder}
                  onCancel={onCancel}
                  onPrintReceipt={onPrintReceipt}
                  onOpenCancelModal={onOpenCancelModal}
                  onCloseCancelModal={onCloseCancelModal}
                  showCancelModal={showCancelModal}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}