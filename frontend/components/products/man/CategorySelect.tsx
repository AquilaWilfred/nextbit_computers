"use client";

import { memo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/types/products/man/products.types";

interface CategorySelectProps {
  value: string;
  rootCategories: Category[];
  subCategories: Category[];
  onChange: (value: string) => void;
}

export const CategorySelect = memo(function CategorySelect({
  value,
  rootCategories,
  subCategories,
  onChange,
}: CategorySelectProps) {
  const getSubCategories = (parentId: number) => 
    subCategories.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-1.5">
      <Label>Category *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {rootCategories.map((parent) => (
            <SelectGroup key={parent.id}>
              <SelectLabel className="font-semibold text-[var(--brand)]">{parent.name}</SelectLabel>
              <SelectItem value={String(parent.id)}>All {parent.name}</SelectItem>
              {getSubCategories(parent.id).map((child) => (
                <SelectItem key={child.id} value={String(child.id)} className="pl-6">
                  {child.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});