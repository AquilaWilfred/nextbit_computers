"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductsSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const ProductsSearch = memo(function ProductsSearch({ value, onChange }: ProductsSearchProps) {
  return (
    <Card className="p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <Input
          placeholder="Search products by name or brand..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </Card>
  );
});