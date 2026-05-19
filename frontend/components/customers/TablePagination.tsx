"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ITEMS_PER_PAGE_OPTIONS } from "@/constants/customers.constant";

interface TablePaginationProps {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  page: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export const TablePagination = memo(function TablePagination({
  startIndex,
  endIndex,
  totalItems,
  page,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onPreviousPage,
  onNextPage,
}: TablePaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border mt-4">
      <p className="text-sm text-muted-foreground text-center sm:text-left">
        Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems} entries
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
});