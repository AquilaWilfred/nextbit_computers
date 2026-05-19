"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, ImageIcon, EyeOff } from "lucide-react";

interface SubCategoryCardProps {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const SubCategoryCard = memo(function SubCategoryCard({
  name,
  slug,
  description,
  imageUrl,
  active,
  onEdit,
  onDelete,
}: SubCategoryCardProps) {
  return (
    <Card
      className={`p-4 flex flex-col transition-all hover:border-[var(--brand)]/40 hover:shadow-md ${
        active === false ? "opacity-60 bg-muted/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/50">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground opacity-50" />
          )}
        </div>
      </div>
      
      <div className="flex-1 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-base">{name}</h3>
          {active === false && (
            <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1">
              <EyeOff className="w-3 h-3" />
            </Badge>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground mb-2">/{slug}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description || "No description."}
        </p>
      </div>
      
      <div className="flex gap-2 pt-3 border-t border-border mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={onEdit}
        >
          <Edit2 size={14} /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onDelete}
          aria-label="Delete sub-category"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  );
});