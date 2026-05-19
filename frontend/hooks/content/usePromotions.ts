import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Promotion } from "@/types/content.types";
import { API_ENDPOINTS } from "@/constants/content.constants";
import { apiFetch } from "@/lib/utils/content.utils";

export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await apiFetch<Promotion[]>(API_ENDPOINTS.promotions);
      setPromotions(data);
    } catch {
      toast.error("Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const savePromotion = useCallback(async (data: Partial<Promotion>) => {
    const response = await apiFetch<Promotion>(API_ENDPOINTS.promotions, {
      method: data.id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    await refetch();
    return response;
  }, [refetch]);

  const deletePromotion = useCallback(async (id: number) => {
    await apiFetch(`${API_ENDPOINTS.promotions}/${id}`, { method: "DELETE" });
    await refetch();
  }, [refetch]);

  return { promotions, isLoading, refetch, savePromotion, deletePromotion };
}