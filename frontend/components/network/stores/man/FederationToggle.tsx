"use client";

import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock } from "lucide-react";

interface FederationToggleProps {
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const FederationToggle = memo(function FederationToggle({
  enabled,
  disabled,
  onToggle,
}: FederationToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <Unlock className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      )}
      <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
    </div>
  );
});