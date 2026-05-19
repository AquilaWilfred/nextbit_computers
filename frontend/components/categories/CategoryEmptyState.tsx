"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Layers, Plus } from "lucide-react";

interface CategoryEmptyStateProps {
  onAddParent: () => void;
}

export const CategoryEmptyState = memo(function CategoryEmptyState({ onAddParent }: CategoryEmptyStateProps) {
  return (
    <div className="text-center py-20 bg-card border border-border rounded-xl border-dashed">
      <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
      <p className="font-medium text-lg">No categories found</p>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Create your first parent category to start organizing your products.
      </p>
      <Button onClick={onAddParent} className="bg-[var(--brand)] text-white hover:opacity-90">
        <Plus size={16} className="mr-2" /> Add Parent Category
      </Button>
    </div>
  );
});