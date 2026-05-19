"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2 } from "lucide-react";

interface BrandFormProps {
  newBrand: string;
  onNewBrandChange: (value: string) => void;
  onAddBrand: (e: React.FormEvent) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isSaving: boolean;
}

export const BrandForm = memo(function BrandForm({
  newBrand,
  onNewBrandChange,
  onAddBrand,
  search,
  onSearchChange,
  isSaving,
}: BrandFormProps) {
  return (
    <Card className="p-5 space-y-4">
      <form onSubmit={onAddBrand} className="flex gap-3">
        <Input
          placeholder="Add a new brand (e.g. Ubiquiti, Fortinet…)"
          value={newBrand}
          onChange={(e) => onNewBrandChange(e.target.value)}
          className="flex-1 max-w-sm"
          aria-label="New brand name"
        />
        <Button
          type="submit"
          disabled={!newBrand.trim() || isSaving}
          className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 shrink-0"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Add Brand
        </Button>
      </form>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search brands…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          aria-label="Search brands"
        />
      </div>
    </Card>
  );
});