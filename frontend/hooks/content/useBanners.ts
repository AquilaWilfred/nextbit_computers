import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Banner } from "@/types/content.types";
import { API_ENDPOINTS } from "@/constants/content.constants";
import { apiFetch } from "@/lib/utils/content.utils";

export function useBanners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await apiFetch<Banner[]>(API_ENDPOINTS.banners);
      setBanners(data);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const saveBanner = useCallback(async (data: Partial<Banner>) => {
    const response = await apiFetch<Banner>(API_ENDPOINTS.banners, {
      method: data.id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    await refetch();
    return response;
  }, [refetch]);

  const deleteBanner = useCallback(async (id: number) => {
    await apiFetch(`${API_ENDPOINTS.banners}/${id}`, { method: "DELETE" });
    await refetch();
  }, [refetch]);

  const reorderBanners = useCallback(async (ids: number[]) => {
    await apiFetch(API_ENDPOINTS.reorderBanners, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    await refetch();
  }, [refetch]);

  return { banners, isLoading, refetch, saveBanner, deleteBanner, reorderBanners };
}