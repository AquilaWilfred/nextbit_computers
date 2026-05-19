"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { getCategoryForBrand } from "@/lib/utils/brand.utils";
import { CATEGORY_ICONS } from "@/constants/brands.constants";

interface BrandCardProps {
  brand: string;
  onRemove: (brand: string) => void;
}

export const BrandCard = memo(function BrandCard({ brand, onRemove }: BrandCardProps) {
  const category = getCategoryForBrand(brand);
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS["Other"];

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:border-[var(--brand)]/30 hover:shadow-sm transition-all group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={15} className="text-[var(--brand)] shrink-0" aria-hidden />
        <span className="font-medium truncate">{brand}</span>
        <span className="text-[10px] text-muted-foreground hidden lg:block truncate">
          {category}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(brand)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        aria-label={`Remove ${brand}`}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  );
});