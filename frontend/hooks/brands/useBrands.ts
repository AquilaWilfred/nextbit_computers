import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { BrandsApiResponse } from "@/types/brands.types";
import { API_BASE, PRESET_BRANDS } from "@/constants/brands.constants";

async function fetchBrands(): Promise<string[]> {
  const res = await fetch(`${API_BASE}?key=brands`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch brands");
  const json: BrandsApiResponse = await res.json();
  return Array.isArray(json.brands) ? json.brands : [];
}

async function saveBrands(brands: string[]): Promise<void> {
  const res = await fetch(API_BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "brands", value: brands }),
  });
  if (!res.ok) throw new Error("Failed to save brands");
}

export function useBrands() {
  const [brands, setBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchBrands();
      setBrands(data.length > 0 ? data : PRESET_BRANDS.map((b) => b.name));
    } catch {
      setBrands(PRESET_BRANDS.map((b) => b.name));
      toast.error("Could not load brands from server; using defaults.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const persistBrands = useCallback(async (updated: string[]) => {
    setIsSaving(true);
    try {
      await saveBrands(updated);
      toast.success("Brands updated");
      return true;
    } catch {
      toast.error("Failed to save brands");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const addBrand = useCallback(async (newBrand: string) => {
    const trimmed = newBrand.trim();
    if (!trimmed) return false;
    
    if (brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Brand already exists");
      return false;
    }
    
    const updated = [...brands, trimmed];
    setBrands(updated);
    const success = await persistBrands(updated);
    return success;
  }, [brands, persistBrands]);

  const removeBrand = useCallback(async (name: string) => {
    if (!confirm(`Remove "${name}"?`)) return false;
    
    const updated = brands.filter((b) => b !== name);
    setBrands(updated);
    const success = await persistBrands(updated);
    return success;
  }, [brands, persistBrands]);

  const addPresetBrand = useCallback(async (name: string) => {
    if (brands.some((b) => b.toLowerCase() === name.toLowerCase())) {
      toast.info(`${name} is already in your list`);
      return false;
    }
    
    const updated = [...brands, name];
    setBrands(updated);
    const success = await persistBrands(updated);
    return success;
  }, [brands, persistBrands]);

  return {
    brands,
    isLoading,
    isSaving,
    addBrand,
    removeBrand,
    addPresetBrand,
    refresh: loadBrands,
  };
}