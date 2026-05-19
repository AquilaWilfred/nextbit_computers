"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CustomerSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const CustomerSearch = memo(function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  return (
    <Card className="p-4">
      <label htmlFor="customer-search" className="sr-only">
        Search customers
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden />
        <Input
          id="customer-search"
          placeholder="Search by name or email…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
          autoComplete="off"
        />
      </div>
    </Card>
  );
});