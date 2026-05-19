"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Tag } from "lucide-react";
import { Promotion } from "@/types/content.types";

interface PromotionCardProps {
  promotion: Promotion;
  onEdit: () => void;
  onDelete: () => void;
}

export const PromotionCard = memo(function PromotionCard({
  promotion,
  onEdit,
  onDelete,
}: PromotionCardProps) {
  return (
    <div
      className={`flex items-start justify-between p-5 border border-border bg-card hover:border-[var(--brand)]/30 transition-colors rounded-xl ${
        !promotion.active ? "opacity-60 bg-muted/20" : ""
      }`}
    >
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
          <Tag className="w-5 h-5 text-[var(--brand)]" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{promotion.title}</h3>
            <Badge
              variant={promotion.active ? "default" : "secondary"}
              className={`text-[10px] px-1.5 py-0 ${promotion.active ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {promotion.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{promotion.description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 size={16} />
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
    </div>
  );
});