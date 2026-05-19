"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileImage, Tag, Megaphone } from "lucide-react";
import { ContentType } from "@/types/content.types";

const ICONS = {
  banners: FileImage,
  promotions: Tag,
  announcements: Megaphone,
};

interface ContentEmptyStateProps {
  type: ContentType;
  onAdd: () => void;
}

export const ContentEmptyState = memo(function ContentEmptyState({ type, onAdd }: ContentEmptyStateProps) {
  const Icon = ICONS[type];
  const titles = {
    banners: "No banners found",
    promotions: "No promotions active",
    announcements: "No announcements",
  };
  const descriptions = {
    banners: "Create your first banner to highlight special offers.",
    promotions: "Add promotions to show on the top banner bar.",
    announcements: "Keep your customers informed with news and updates.",
  };

  return (
    <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl border-dashed">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium">{titles[type]}</p>
      <p className="text-sm mt-1">{descriptions[type]}</p>
      <Button onClick={onAdd} className="mt-6 gap-2 bg-[var(--brand)] text-white hover:opacity-90">
        <Plus size={16} /> Add {type.slice(0, -1)}
      </Button>
    </div>
  );
});