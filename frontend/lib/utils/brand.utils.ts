import { Brand } from "@/types/brands.types";
import { PRESET_BRANDS, ALL_CATEGORIES } from "@/constants/brands.constants";

export function getCategoryForBrand(name: string): string {
  const match = PRESET_BRANDS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase()
  );
  return match?.category ?? "Other";
}

export function getBrandCountByCategory(brands: string[]): Record<string, number> {
  return ALL_CATEGORIES.reduce<Record<string, number>>(
    (acc, cat) => {
      acc[cat] = brands.filter((b) => getCategoryForBrand(b) === cat).length;
      return acc;
    },
    {}
  );
}

export function getPresetNotAdded(brands: string[]): Brand[] {
  return PRESET_BRANDS.filter(
    (p) => !brands.some((b) => b.toLowerCase() === p.name.toLowerCase())
  );
}