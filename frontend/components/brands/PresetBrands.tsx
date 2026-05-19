"use client";

import { memo } from "react";
import { Plus } from "lucide-react";
import { Brand } from "@/types/brands.types";
import { CATEGORY_ICONS } from "@/constants/brands.constants";
import { getPresetNotAdded } from "@/lib/utils/brand.utils";

interface PresetBrandsProps {
  brands: string[];
  onAddPreset: (name: string) => void;
}

export const PresetBrands = memo(function PresetBrands({
  brands,
  onAddPreset,
}: PresetBrandsProps) {
  const presetNotAdded = getPresetNotAdded(brands);

  if (presetNotAdded.length === 0) return null;

  return (
    <section aria-label="Suggested brands to add">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Suggested brands not yet added
      </h2>
      <div className="flex flex-wrap gap-2">
        {presetNotAdded.map(({ name, category }) => {
          const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS["Other"];
          return (
            <button
              key={name}
              onClick={() => onAddPreset(name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors"
              aria-label={`Add ${name}`}
            >
              <Icon size={12} />
              <Plus size={10} />
              {name}
            </button>
          );
        })}
      </div>
    </section>
  );
});