"use client";

import { memo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DISCOUNT_PERCENTAGES } from "@/constants/products/man/man.products.constants";

interface ProductPriceSectionProps {
  price: string;
  comparePrice: string;
  onPriceChange: (value: string) => void;
  onComparePriceChange: (value: string) => void;
  onApplyDiscount: (percentage: number) => void;
}

export const ProductPriceSection = memo(function ProductPriceSection({
  price,
  comparePrice,
  onPriceChange,
  onComparePriceChange,
  onApplyDiscount,
}: ProductPriceSectionProps) {
  const comparePriceNum = parseFloat(comparePrice);
  const priceNum = parseFloat(price);
  const discountPercent = comparePriceNum > 0 
    ? Math.round((1 - priceNum / comparePriceNum) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Price *</Label>
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          Compare Price (Optional)
          {discountPercent > 0 && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
              Save {discountPercent}%
            </span>
          )}
        </Label>
        <Input
          type="number"
          step="0.01"
          value={comparePrice}
          onChange={(e) => onComparePriceChange(e.target.value)}
        />
        {comparePriceNum > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground self-center mr-1">Quick Discount:</span>
            {DISCOUNT_PERCENTAGES.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onApplyDiscount(pct)}
                className="text-[10px] border border-border bg-background hover:bg-muted hover:border-[var(--brand)] px-1.5 py-0.5 rounded transition-colors"
              >
                -{pct}%
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});