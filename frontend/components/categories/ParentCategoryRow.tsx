"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus, ChevronUp, ChevronDown, Layers, Zap, EyeOff } from "lucide-react";

interface ParentCategoryRowProps {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
  active?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddSub: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ParentCategoryRow = memo(function ParentCategoryRow({
  name,
  slug,
  description,
  imageUrl,
  featured,
  active,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onAddSub,
  onEdit,
  onDelete,
}: ParentCategoryRowProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all ${
        active === false ? "opacity-75" : "hover:border-[var(--brand)]/40"
      }`}
    >
      <div className="p-4 sm:p-5 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Move buttons */}
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-6 text-muted-foreground hover:text-foreground"
              disabled={isFirst}
              onClick={onMoveUp}
              aria-label="Move up"
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-6 text-muted-foreground hover:text-foreground"
              disabled={isLast}
              onClick={onMoveDown}
              aria-label="Move down"
            >
              <ChevronDown size={14} />
            </Button>
          </div>

          {/* Image */}
          <div className="w-14 h-14 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <Layers className="text-muted-foreground opacity-50 w-6 h-6" />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-lg font-bold">{name}</h2>
              {featured && (
                <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20">
                  <Zap className="w-3 h-3 mr-1" /> Featured
                </Badge>
              )}
              {active === false && (
                <Badge variant="secondary" className="text-[10px] py-0 h-5">
                  <EyeOff className="w-3 h-3 mr-1" /> Hidden
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              /{slug}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 ml-10 sm:ml-0">
          <Button size="sm" variant="secondary" className="bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20" onClick={onAddSub}>
            <Plus size={16} className="mr-1" /> Add Sub-category
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit2 size={16} className="mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label="Delete category"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
});