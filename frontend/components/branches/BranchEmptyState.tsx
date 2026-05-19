"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export const BranchEmptyState = memo(function BranchEmptyState() {
  return (
    <Card className="p-12 text-center">
      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
      <p className="text-muted-foreground">No branches yet. Add your first branch location.</p>
    </Card>
  );
});