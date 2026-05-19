"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, ImageIcon, GripVertical } from "lucide-react";
import { Banner } from "@/types/content.types";

interface BannerCardProps {
  banner: Banner;
  index: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const BannerCard = memo(function BannerCard({
  banner,
  index,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
  onEdit,
  onDelete,
}: BannerCardProps) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={`p-4 border-border cursor-move transition-all duration-300 ${
        isDragging
          ? "opacity-40 border-2 border-dashed border-[var(--brand)] bg-muted scale-[0.98] shadow-inner"
          : !banner.active
          ? "opacity-60 bg-muted/30 hover:border-[var(--brand)]/50"
          : "bg-card hover:border-[var(--brand)]/50 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-2 opacity-50">
        <GripVertical size={16} />
        <span className="text-xs font-mono">Order: {index + 1}</span>
      </div>

      <div className="aspect-[21/9] bg-secondary/50 border border-border/50 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {banner.image ? (
          <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon size={40} className="text-muted-foreground" />
        )}
      </div>

      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-semibold leading-tight line-clamp-2">{banner.title}</h3>
        <Badge
          variant={banner.active ? "default" : "secondary"}
          className={`shrink-0 ${banner.active ? "bg-green-500 hover:bg-green-600" : ""}`}
        >
          {banner.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onEdit}>
          <Edit2 size={16} /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
});