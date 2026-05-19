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
import { ArrowUpDown } from "lucide-react";
import { Product, SortConfig } from "@/types/products/man/products.types";
import { ITEMS_PER_PAGE_OPTIONS, SORTABLE_COLUMNS } from "@/constants/products/man/man.products.constants";
import { ProductRow } from "./ProductRow";

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  isDeleting: number | null;
  categoryMap: Map<number, string>;
  sortConfig: SortConfig;
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onSort: (key: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export const ProductsTable = memo(function ProductsTable({
  products,
  isLoading,
  isDeleting,
  categoryMap,
  sortConfig,
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  onSort,
  onPageChange,
  onItemsPerPageChange,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading products...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-semibold w-16">Image</th>
              {SORTABLE_COLUMNS.map(({ key, label, right }) => (
                <th
                  key={key}
                  className={`${right ? "text-right" : "text-left"} py-3 px-4 font-semibold cursor-pointer hover:bg-muted/50 select-none`}
                  onClick={() => onSort(key)}
                >
                  <div className={`flex items-center ${right ? "justify-end" : ""} gap-1`}>
                    {label} <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </th>
              ))}
              <th className="text-center py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  categoryName={categoryMap.get(product.categoryId) || String(product.categoryId)}
                  isDeleting={isDeleting === product.id}
                  onEdit={() => onEdit(product)}
                  onDelete={() => onDelete(product.id)}
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