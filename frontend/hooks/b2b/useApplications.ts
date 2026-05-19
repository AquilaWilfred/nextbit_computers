import { useState, useEffect, useCallback } from "react";
import { B2BApplication } from "@/types/b2b.applications.types";

export function useApplications() {
  const [applications, setApplications] = useState<B2BApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/b2b/applications");
      const data = await res.json().catch(() => []);
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const refetch = useCallback(() => fetchApplications(true), [fetchApplications]);

  const pendingCount = applications.filter(
    (a) => a.status === "pending" || a.status === "under_review"
  ).length;

  return {
    applications,
    loading,
    refreshing,
    refetch,
    pendingCount,
  };
}