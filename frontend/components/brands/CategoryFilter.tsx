"use client";

import { memo } from "react";
import { Tag } from "lucide-react";
import { CATEGORY_ICONS, ALL_CATEGORIES } from "@/constants/brands.constants";
import { getBrandCountByCategory } from "@/lib/utils/brand.utils";

interface CategoryFilterProps {
  brands: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = memo(function CategoryFilter({
  brands,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const brandCountByCategory = getBrandCountByCategory(brands);

  return (
    <div className="flex flex-wrap gap-2">
      {["All", ...ALL_CATEGORIES].map((cat) => {
        const Icon = cat === "All" ? Tag : CATEGORY_ICONS[cat] ?? Tag;
        const count = cat === "All" ? brands.length : brandCountByCategory[cat] ?? 0;
        return (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              activeCategory === cat
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "bg-muted text-muted-foreground border-border hover:border-[var(--brand)]/40"
            }`}
            aria-pressed={activeCategory === cat}
          >
            <Icon size={12} />
            {cat}
            <span
              className={`ml-0.5 px-1.5 py-0 rounded-full text-[10px] ${
                activeCategory === cat ? "bg-white/20" : "bg-background"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
});