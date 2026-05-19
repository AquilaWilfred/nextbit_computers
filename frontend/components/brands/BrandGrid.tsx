"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";
import { BrandCard } from "./BrandCard";
import { BrandEmptyState } from "./BrandEmptyState";

interface BrandGridProps {
  brands: string[];
  isLoading: boolean;
  onRemove: (brand: string) => void;
}

export const BrandGrid = memo(function BrandGrid({
  brands,
  isLoading,
  onRemove,
}: BrandGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (brands.length === 0) {
    return <BrandEmptyState />;
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
      {brands.map((brand) => (
        <BrandCard key={brand} brand={brand} onRemove={onRemove} />
      ))}
    </div>
  );
});