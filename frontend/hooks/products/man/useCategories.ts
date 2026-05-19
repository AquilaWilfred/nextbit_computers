import { useState, useEffect } from "react";
import { Category } from "@/types/products/man/products.types";
import { apiFetch } from "@/lib/utils/products/man/man.products.utils";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const rootCategories = categories.filter((c) => !c.parentId);
  const getSubCategories = (parentId: number) => 
    categories.filter((c) => c.parentId === parentId);
  
  const getCategoryName = (id: number) => 
    categories.find((c) => c.id === id)?.name || String(id);

  return {
    categories,
    isLoading,
    rootCategories,
    getSubCategories,
    getCategoryName,
  };
}