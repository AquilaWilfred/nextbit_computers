import Link from "next/link";
import { ChevronRight, Printer, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";
import { OrderDetail as OrderDetailType, PublicSettings } from "@/types/dashboard/dashboard.types";
import { OrderTracking } from "./OrderTracking";
import { DeliveryMap } from "./DeliveryMap";
import { CancelOrderModal } from "./CancelOrderModal";
import { OrderStatusBadge } from "./OrderStatusBadge";
import StoreLoader from "@/components/StoreLoader";

interface OrderDetailProps {
  orderDetail: OrderDetailType | null;
  settings: PublicSettings | null;
  isLoading: boolean;
  isCancelling: boolean;
  isReordering: boolean;
  driverLocation: { lat: number; lng: number } | null;
  onReorder: () => void;
  onCancel: (reason: string) => void;
  onOpenCancelModal: () => void;
  onPrintReceipt: () => void;
  onCloseCancelModal: () => void;
  showCancelModal: boolean;
}

export function OrderDetail({
  orderDetail,
  settings,
  isLoading,
  isCancelling,
  isReordering,
  driverLocation,
  onReorder,
  onCancel,
  onOpenCancelModal,
  onPrintReceipt,
  onCloseCancelModal,
  showCancelModal,
}: OrderDetailProps) {
  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><StoreLoader /></div>;
  }

  if (!orderDetail) {
    return <div className="text-center py-20 text-muted-foreground">Order not found</div>;
  }

  if (!orderDetail.order) {
    return <div className="text-center py-20 text-muted-foreground">Order data is unavailable</div>;
  }

  const { order, items, history, agent } = orderDetail;
  const canCancel = ["pending", "payment_confirmed", "processing"].includes(order.status);
  const canReorder = ["delivered", "cancelled", "refunded"].includes(order.status);
  const showMap = order.status === "shipped" || order.status === "out_for_delivery";

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link href="/dashboard?tab=orders" className="text-muted-foreground hover:text-foreground">← Orders</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono">{order.orderNumber}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {canCancel && (
            <Button
              variant="destructive" size="sm"
              onClick={onOpenCancelModal}
              disabled={isCancelling}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              {isCancelling ? "Cancelling…" : "Cancel Order"}
            </Button>
          )}
          {canReorder && (
            <Button
              variant="default" size="sm"
              onClick={onReorder}
              disabled={isReordering}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {isReordering ? "Adding…" : "Reorder"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onPrintReceipt} className="gap-2">
            <Printer className="w-4 h-4" aria-hidden="true" /> Print Receipt
          </Button>
        </div>
      </div>

      <OrderTracking currentStatus={order.status} history={history} />

      {showMap && (
        <DeliveryMap
          agentName={agent?.name}
          agentPhone={agent?.phone}
          vehicleNumber={agent?.vehicleNumber}
          deliveryOtp={order.deliveryOtp}
          driverLocation={driverLocation}
        />
      )}

      {/* Order Items */}
      <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="items-heading">
        <h2 id="items-heading" className="font-display font-semibold mb-4">Items</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 items-center">
              {item.productImage && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                    width={48} height={48}
                    loading="lazy" decoding="async"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="border-t border-border mt-4 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{parseFloat(order.shippingCost) === 0 ? "Free" : formatPrice(order.shippingCost)}</dd></div>
          <div className="flex justify-between font-display font-bold text-base pt-1 border-t border-border"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      <CancelOrderModal
        isOpen={showCancelModal}
        isPending={isCancelling}
        onClose={onCloseCancelModal}
        onConfirm={onCancel}
      />
    </div>
  );
}