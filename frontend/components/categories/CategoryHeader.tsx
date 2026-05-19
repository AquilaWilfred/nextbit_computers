"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CategoryHeaderProps {
  onAddParent: () => void;
}

export const CategoryHeader = memo(function CategoryHeader({ onAddParent }: CategoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Categories Management</h1>
        <p className="text-muted-foreground mt-1">
          Organize your products into nested parent and sub-categories
        </p>
      </div>
      <Button
        onClick={onAddParent}
        className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
      >
        <Plus size={18} /> Add Parent Category
      </Button>
    </div>
  );
});