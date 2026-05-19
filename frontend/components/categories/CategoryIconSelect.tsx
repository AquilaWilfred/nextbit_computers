"use client";

import { memo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dynamicIconMap } from "@/lib/iconMap";
import { ICON_OPTIONS } from "@/constants/categories.constants";

interface CategoryIconSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export const CategoryIconSelect = memo(function CategoryIconSelect({
  value,
  onChange,
}: CategoryIconSelectProps) {
  return (
    <div className="space-y-2">
      <Label>Category Icon</Label>
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : val)}
      >
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select an icon" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default / None</SelectItem>
          {ICON_OPTIONS.map((iconName) => {
            const Icon = dynamicIconMap[iconName];
            return (
              <SelectItem key={iconName} value={iconName}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                  <span>{iconName}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
});