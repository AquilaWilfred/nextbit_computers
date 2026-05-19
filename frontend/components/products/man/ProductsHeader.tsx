"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProductsHeaderProps {
  onAddProduct: () => void;
}

export const ProductsHeader = memo(function ProductsHeader({ onAddProduct }: ProductsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">Products Management</h2>
        <p className="text-muted-foreground mt-1">Manage your store products, inventory, and pricing</p>
      </div>
      <Button onClick={onAddProduct} className="gap-2">
        <Plus size={18} /> Add Product
      </Button>
    </div>
  );
});