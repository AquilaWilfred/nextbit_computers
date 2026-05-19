"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useBanners } from "@/hooks/content/useBanners";
import { useBannerReorder } from "@/hooks/content/useBannerReorder";
import { BannerCard } from "./BannerCard";
import { ContentEmptyState } from "./ContentEmptyState";
import { Banner } from "@/types/content.types";

interface BannersTabProps {
  onAdd: () => void;
  onEdit: (banner: Banner) => void;
  onDelete: (id: number) => Promise<void>;
}

export const BannersTab = memo(function BannersTab({ onAdd, onEdit, onDelete }: BannersTabProps) {
  const { banners, isLoading, reorderBanners } = useBanners();
  const {
    orderedBanners,
    draggedIndex,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDragOver,
  } = useBannerReorder(banners, reorderBanners);

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
          <Plus size={18} /> Add Banner
        </Button>
      </div>

      {!banners?.length ? (
        <ContentEmptyState type="banner" onAdd={onAdd} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedBanners.map((banner, index) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              index={index}
              isDragging={draggedIndex === index}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onEdit={() => onEdit(banner)}
              onDelete={() => onDelete(banner.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});