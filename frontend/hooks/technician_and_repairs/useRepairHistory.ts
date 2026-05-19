// hooks/useRepairHistory.ts
import { useState, useEffect } from "react";
import { CompletedRepair } from "@/types/repairs.types";
import { proxyClient } from "@/lib/api-client"; // ← ADD THIS

export function useRepairHistory(userId: number) {
  const [history, setHistory] = useState<CompletedRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ADD for debugging

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // CHANGE: Use proxyClient instead of fetch
        const data = await proxyClient.get<CompletedRepair[]>(`/api/repairs/history?user_id=${userId}`);
        
        setHistory(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch history";
        setError(errorMessage);
        console.error("Failed to load repair history:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const totalSpent = history.reduce((sum, h) => sum + (h.cost || 0), 0);
  const averageRating = history.length
    ? (history.reduce((sum, h) => sum + (h.userRating || 0), 0) / history.length).toFixed(1)
    : "0";
  const activeWarranties = history.filter((h) => h.warrantyActive).length;

  return {
    history,
    loading,
    error, // ADD for debugging
    totalSpent,
    averageRating,
    activeWarranties,
  };
}