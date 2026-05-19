"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { HourRow } from "@/types/branches.types";

interface BranchHoursEditorProps {
  hours: HourRow[];
  onUpdateHour: (index: number, field: keyof HourRow, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
}

export const BranchHoursEditor = memo(function BranchHoursEditor({
  hours,
  onUpdateHour,
  onAddRow,
  onRemoveRow,
}: BranchHoursEditorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Opening Hours</label>
      
      {hours.map((hour, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Day"
            value={hour.label}
            className="w-32"
            onChange={(e) => onUpdateHour(i, "label", e.target.value)}
          />
          <Input
            placeholder="e.g. 9:00 AM - 6:00 PM"
            value={hour.value}
            onChange={(e) => onUpdateHour(i, "value", e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveRow(i)}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 w-full"
        onClick={onAddRow}
      >
        <Plus size={13} /> Add Hours Row
      </Button>
    </div>
  );
});