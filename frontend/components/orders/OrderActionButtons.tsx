"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Truck } from "lucide-react";
import { Order } from "@/types/orders.types";

interface OrderActionButtonsProps {
  order: Order;
  onView: () => void;
  onInvoice: () => void;
  onTracking: () => void;
}

export const OrderActionButtons = memo(function OrderActionButtons({
  order,
  onView,
  onInvoice,
  onTracking,
}: OrderActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" onClick={onView} title="View Details">
        <Eye size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={onInvoice} title="Generate Invoice">
        <FileText size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={onTracking} title="Update Tracking">
        <Truck size={16} />
      </Button>
    </div>
  );
});