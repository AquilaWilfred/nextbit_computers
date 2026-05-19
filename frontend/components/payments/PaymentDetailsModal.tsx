"use client";

import { memo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Payment } from "@/types/pay.types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_COLORS } from "@/constants/pay.constants";
import { formatAmount, formatDateTime } from "@/lib/utils/pay.utils";

interface PaymentDetailsModalProps {
  payment: Payment | null;
  refunding: boolean;
  onClose: () => void;
  onRefund: () => void;
}

export const PaymentDetailsModal = memo(function PaymentDetailsModal({
  payment,
  refunding,
  onClose,
  onRefund,
}: PaymentDetailsModalProps) {
  if (!payment) return null;

  const details = [
    { label: "Payment ID", value: <span className="font-mono text-sm">{payment.id}</span> },
    { label: "Order ID", value: <span className="font-mono text-sm">{payment.orderId}</span> },
    { label: "Amount", value: <span className="text-lg font-bold">{formatAmount(payment.amount)}</span> },
    { label: "Method", value: <span className="font-semibold">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</span> },
    {
      label: "Status",
      value: (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${PAYMENT_STATUS_COLORS[payment.status] || ""}`}>
          {payment.status}
        </span>
      ),
    },
    { label: "Date", value: <span className="font-semibold">{formatDateTime(payment.createdAt)}</span> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Payment Details</h3>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="space-y-4">
            {details.map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                {value}
              </div>
            ))}

            <div className="border-t border-border pt-4 space-y-2">
              <Link href={`/admin/orders/${payment.orderId}`}>
                <Button variant="outline" className="w-full">View Order Details</Button>
              </Link>
              {payment.status === "completed" && (
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={onRefund}
                  disabled={refunding}
                >
                  {refunding ? "Processing..." : "Process Refund"}
                </Button>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});