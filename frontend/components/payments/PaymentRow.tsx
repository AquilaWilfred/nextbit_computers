"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Payment } from "@/types/pay.types";
import { PAYMENT_METHOD_LABELS } from "@/constants/pay.constants";
import { formatAmount, formatDate, getPaymentStatusColor } from "@/lib/utils/pay.utils";
import { EscrowStatusBadge } from "./EscrowStatusBadge";

interface PaymentRowProps {
  payment: Payment & { escrowState?: string };
  onView: () => void;
}

export const PaymentRow = memo(function PaymentRow({ payment, onView }: PaymentRowProps) {
  return (
    <tr className="border-b border-border hover:bg-secondary transition-colors">
      <td className="py-3 px-4 font-mono text-xs">{payment.id}</td>
      <td className="py-3 px-4 font-mono text-xs">{payment.orderId}</td>
      <td className="py-3 px-4">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</td>
      <td className="py-3 px-4 text-right font-semibold">{formatAmount(payment.amount)}</td>
      <td className="py-3 px-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
          {payment.status}
        </span>
      </td>
      {payment.escrowState && (
        <td className="py-3 px-4">
          <EscrowStatusBadge state={payment.escrowState} />
        </td>
      )}
      <td className="py-3 px-4">{formatDate(payment.createdAt)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
});