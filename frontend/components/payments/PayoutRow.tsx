"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { PayoutRequest } from "@/types/pay.types";
import { PAYOUT_STATUS_COLORS } from "@/constants/pay.constants";
import { formatAmount, formatDateTime } from "@/lib/utils/pay.utils";

interface PayoutRowProps {
  payout: PayoutRequest;
  approvingId: number | null;
  rejectingId: number | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export const PayoutRow = memo(function PayoutRow({
  payout,
  approvingId,
  rejectingId,
  onApprove,
  onReject,
}: PayoutRowProps) {
  const isPending = payout.status === "pending";
  const isApproving = approvingId === payout.id;
  const isRejecting = rejectingId === payout.id;

  return (
    <tr className="border-b border-border hover:bg-secondary transition-colors">
      <td className="py-3 px-4 font-mono text-xs">{payout.id}</td>
      <td className="py-3 px-4">{payout.agentId}</td>
      <td className="py-3 px-4 text-right font-semibold text-[var(--brand)]">
        {formatAmount(parseFloat(payout.amount))}
      </td>
      <td className="py-3 px-4">{formatDateTime(payout.requestedAt)}</td>
      <td className="py-3 px-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PAYOUT_STATUS_COLORS[payout.status]}`}>
          {payout.status}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            disabled={!isPending || isApproving || isRejecting}
            onClick={() => onApprove(payout.id)}
          >
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={!isPending || isApproving || isRejecting}
            onClick={() => onReject(payout.id)}
          >
            <X className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      </td>
    </tr>
  );
});