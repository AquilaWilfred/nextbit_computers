"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Loader2, ImageIcon } from "lucide-react";
import { Product } from "@/types/products/man/products.types";
import { StockBadge } from "./StockBadge";
import { formatPrice } from "@/lib/cart";

interface ProductRowProps {
  product: Product;
  categoryName: string;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProductRow = memo(function ProductRow({
  product,
  categoryName,
  isDeleting,
  onEdit,
  onDelete,
}: ProductRowProps) {
  const hasImage = product.images && product.images.length > 0;

  return (
    <tr className={`border-b border-border hover:bg-secondary transition-colors ${!product.active ? "opacity-50" : ""}`}>
      <td className="py-3 px-4">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {hasImage ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground" />
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="font-medium">{product.name}</p>
        {product.featured && (
          <span className="text-[10px] bg-[var(--brand)]/10 text-[var(--brand)] px-1.5 py-0.5 rounded border border-[var(--brand)]/20">
            Featured
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-muted-foreground">{categoryName}</td>
      <td className="py-3 px-4">{product.brand || "—"}</td>
      <td className="py-3 px-4 text-right font-semibold">{formatPrice(product.price)}</td>
      <td className="py-3 px-4 text-right"><StockBadge stock={product.stock} /></td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </Button>
        </div>
      </td>
    </tr>
  );
});