"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const CategorySkeleton = memo(function CategorySkeleton() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
    </div>
  );
});