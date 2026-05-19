"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { Order, Agent } from "@/types/orders.types";
import { formatDate } from "@/lib/utils/order.utils";
import { formatPrice } from "@/lib/cart";
import { DeliveryAssignment } from "./DeliveryAssignment";

interface OrderDetailsModalProps {
  order: Order;
  agents: Agent[];
  selectedAgentId: string;
  assignAgentId: string;
  isAssigning: boolean;
  onAgentChange: (value: string) => void;
  onAssign: () => void;
  onClose: () => void;
}

export const OrderDetailsModal = memo(function OrderDetailsModal({
  order,
  agents,
  selectedAgentId,
  assignAgentId,
  isAssigning,
  onAgentChange,
  onAssign,
  onClose,
}: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Order {order.orderNumber}</h3>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{order.shippingFullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-semibold">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-2">Shipping Address</h4>
              <p className="text-sm">
                {order.shippingAddress}<br />
                {order.shippingCity}, {order.shippingPostalCode}<br />
                {order.shippingCountry}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {order.status === "out_for_delivery" && order.deliveryOtp && (
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[var(--brand)]" /> Active Delivery
                </h4>
                <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                  <span className="text-sm text-muted-foreground">Customer OTP Code:</span>
                  <span className="font-mono text-lg font-bold tracking-widest text-[var(--brand)]">
                    {order.deliveryOtp}
                  </span>
                </div>
              </div>
            )}

            <DeliveryAssignment
              order={order}
              agents={agents}
              selectedAgentId={selectedAgentId || assignAgentId || order.deliveryAgentId?.toString() || ""}
              onAgentChange={onAgentChange}
              onAssign={onAssign}
              isAssigning={isAssigning}
            />

            <Button variant="outline" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});