"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PayoutRequest } from "@/types/pay.types";
import { PAYOUT_TABLE_COLUMNS, ITEMS_PER_PAGE_OPTIONS } from "@/constants/pay.constants";
import { PayoutRow } from "./PayoutRow";

interface PayoutsTableProps {
  payouts: PayoutRequest[];
  isLoading: boolean;
  approvingId: number | null;
  rejectingId: number | null;
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export const PayoutsTable = memo(function PayoutsTable({
  payouts,
  isLoading,
  approvingId,
  rejectingId,
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onApprove,
  onReject,
}: PayoutsTableProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading payout requests...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              {PAYOUT_TABLE_COLUMNS.map((col) => (
                <th
                  key={col}
                  className={`${
                    col === "Amount" ? "text-right" : col === "Actions" ? "text-center" : "text-left"
                  } py-3 px-4 font-semibold`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No payout requests found
                </td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <PayoutRow
                  key={payout.id}
                  payout={payout}
                  approvingId={approvingId}
                  rejectingId={rejectingId}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(val) => onItemsPerPageChange(Number(val))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});