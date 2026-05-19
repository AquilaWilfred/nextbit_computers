"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";

export const AdminNote = memo(function AdminNote() {
  return (
    <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-4 py-3">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
      <span>
        <strong>Global Admin note:</strong> You can toggle federation on behalf of any store.
        Store Admins can only toggle their own branch. Conflict flags must be escalated to a
        NextBit Manager — they cannot be resolved at store level.
      </span>
    </div>
  );
});