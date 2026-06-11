// hooks/nextbit-wallet/useAdminCardsData.ts

import { useState, useEffect, useCallback } from "react";
import { adminCardsService } from "@/lib/services/nextbit-wallet/admin.cards.service";
import { AdminStats, CardRecord, Application, CardHolder, Transaction } from "@/types/nextbit-wallet/admin.cards.types";
import { toast } from "sonner";

export function useAdminCardsData() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminCardsService.refreshAllData();
      setStats(data.stats);
      setCards(data.cards);
      setApplications(data.applications);
      setHolders(data.holders);
      setTransactions(data.transactions);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load data");
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refetch = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    stats,
    cards,
    applications,
    holders,
    transactions,
    loading,
    error,
    refetch,
  };
}