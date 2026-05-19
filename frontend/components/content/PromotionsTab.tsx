"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { usePromotions } from "@/hooks/content/usePromotions";
import { PromotionCard } from "./PromotionCard";
import { ContentEmptyState } from "./ContentEmptyState";
import { Promotion } from "@/types/content.types";

interface PromotionsTabProps {
  onAdd: () => void;
  onEdit: (promotion: Promotion) => void;
  onDelete: (id: number) => Promise<void>;
}

export const PromotionsTab = memo(function PromotionsTab({ onAdd, onEdit, onDelete }: PromotionsTabProps) {
  const { promotions, isLoading } = usePromotions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={onAdd}>
          <Plus size={18} /> Add Promotion
        </Button>
      </div>

      {!promotions?.length ? (
        <ContentEmptyState type="promotion" onAdd={onAdd} />
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              onEdit={() => onEdit(promotion)}
              onDelete={() => onDelete(promotion.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});