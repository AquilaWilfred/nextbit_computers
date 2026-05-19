import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Category } from "@/types/categories.types";
import { apiFetch } from "@/lib/utils/category.utils";
import { API_BASE } from "@/constants/categories.constants";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Category[]>(API_BASE);
      setCategories(data);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const upsertCategory = useCallback(async (data: Partial<Category>): Promise<Category> => {
    const response = await apiFetch<Category>(API_BASE, {
      method: data.id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    
    setCategories((prev) =>
      data.id
        ? prev.map((c) => (c.id === response.id ? response : c))
        : [...prev, response]
    );
    
    return response;
  }, []);

  const deleteCategory = useCallback(async (id: number): Promise<void> => {
    await apiFetch<void>(`${API_BASE}/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorderCategories = useCallback(async (ids: number[]): Promise<void> => {
    await apiFetch<void>(`${API_BASE}/reorder`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }, []);

  return {
    categories,
    isLoading,
    fetchCategories,
    upsertCategory,
    deleteCategory,
    reorderCategories,
    setCategories,
  };
}