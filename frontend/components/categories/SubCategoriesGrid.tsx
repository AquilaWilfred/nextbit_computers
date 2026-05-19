"use client";

import { memo } from "react";
import { SubCategoryCard } from "./SubCategoryCard";
import { Category } from "@/types/categories.types";

interface SubCategoriesGridProps {
  subCategories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

export const SubCategoriesGrid = memo(function SubCategoriesGrid({
  subCategories,
  onEdit,
  onDelete,
}: SubCategoriesGridProps) {
  if (subCategories.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground bg-background">
        No sub-categories yet. Click "Add Sub-category" above to create one.
      </div>
    );
  }

  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-background">
      {subCategories.map((child) => (
        <SubCategoryCard
          key={child.id}
          id={child.id}
          name={child.name}
          slug={child.slug}
          description={child.description}
          imageUrl={child.imageUrl}
          active={child.active}
          onEdit={() => onEdit(child)}
          onDelete={() => onDelete(child.id)}
        />
      ))}
    </div>
  );
});