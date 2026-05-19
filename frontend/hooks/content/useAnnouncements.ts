import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Announcement } from "@/types/content.types";
import { API_ENDPOINTS } from "@/constants/content.constants";
import { apiFetch } from "@/lib/utils/content.utils";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await apiFetch<Announcement[]>(API_ENDPOINTS.announcements);
      setAnnouncements(data);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const saveAnnouncement = useCallback(async (data: Partial<Announcement>) => {
    const response = await apiFetch<Announcement>(API_ENDPOINTS.announcements, {
      method: data.id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    await refetch();
    return response;
  }, [refetch]);

  const deleteAnnouncement = useCallback(async (id: number) => {
    await apiFetch(`${API_ENDPOINTS.announcements}/${id}`, { method: "DELETE" });
    await refetch();
  }, [refetch]);

  return { announcements, isLoading, refetch, saveAnnouncement, deleteAnnouncement };
}