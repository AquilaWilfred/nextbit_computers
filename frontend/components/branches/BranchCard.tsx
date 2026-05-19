"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock, Star, Pencil, Trash2, Loader2 } from "lucide-react";
import { Branch } from "@/types/branches.types";
import { formatCoordinates, getGoogleMapsUrl } from "@/lib/utils/branchUtilApis";

interface BranchCardProps {
  branch: Branch;
  onEdit: (branch: Branch) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const BranchCard = memo(function BranchCard({
  branch,
  onEdit,
  onDelete,
  isDeleting,
}: BranchCardProps) {
  return (
    <Card className="p-5 space-y-3 relative">
      {branch.isMain && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold bg-[var(--brand)]/10 text-[var(--brand)] px-2 py-0.5 rounded-full">
          <Star size={10} /> Main Branch
        </span>
      )}

      <div>
        <h2 className="font-semibold text-base">{branch.name}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {branch.active ? "Active" : "Inactive"}
        </p>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--brand)]" />
          <span>{branch.address}</span>
        </div>

        {branch.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone size={14} className="shrink-0 text-[var(--brand)]" />
            <span>{branch.phone}</span>
          </div>
        )}

        {branch.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail size={14} className="shrink-0 text-[var(--brand)]" />
            <span>{branch.email}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin size={14} className="shrink-0 text-blue-500" />
          <a
            href={getGoogleMapsUrl(branch.lat, branch.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-xs"
          >
            {formatCoordinates(branch.lat, branch.lng)}
          </a>
        </div>
      </div>

      {branch.hours && branch.hours.length > 0 && (
        <div className="pt-2 border-t border-border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <Clock size={12} /> Hours
          </div>
          {branch.hours.map((hour, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">{hour.label}</span>
              <span>{hour.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => onEdit(branch)}
        >
          <Pencil size={13} /> Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive gap-1.5"
          onClick={() => onDelete(branch.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
        </Button>
      </div>
    </Card>
  );
});