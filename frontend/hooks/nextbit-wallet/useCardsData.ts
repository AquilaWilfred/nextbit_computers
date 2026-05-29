import { useState, useEffect, useCallback } from 'react';
import { cardsService } from '@/lib/services/nextbit-wallet/cards.service';
import { CardProduct, CardApplication, VirtualCard, Transaction, UserStats } from '@/types/nextbit-wallet/cards.types';
import { toast } from 'sonner';

interface UseCardsDataReturn {
  products: CardProduct[];
  applications: CardApplication[];
  virtualCard: VirtualCard | null;
  transactions: Transaction[];
  stats: UserStats;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCardsData(): UseCardsDataReturn {
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [virtualCard, setVirtualCard] = useState<VirtualCard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<UserStats>({
    rewardsEarned: 0,
    securityLevel: "3D Secure",
    totalSpent: 0,
    cardsIssued: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const productsData = await cardsService.getProducts();
      setProducts(productsData);

      const [applicationsResult, virtualCardResult, transactionsResult, statsResult] = await Promise.allSettled([
        cardsService.getApplications(),
        cardsService.getVirtualCard(),
        cardsService.getTransactions(),
        cardsService.getUserStats(),
      ]);

      if (applicationsResult.status === 'fulfilled') {
        setApplications(applicationsResult.value);
      } else if (!applicationsResult.reason?.message?.includes('HTTP 401')) {
        throw applicationsResult.reason;
      } else {
        setApplications([]);
      }

      if (virtualCardResult.status === 'fulfilled') {
        setVirtualCard(virtualCardResult.value);
      } else if (!virtualCardResult.reason?.message?.includes('HTTP 401')) {
        throw virtualCardResult.reason;
      } else {
        setVirtualCard(null);
      }

      if (transactionsResult.status === 'fulfilled') {
        setTransactions(transactionsResult.value);
      } else if (!transactionsResult.reason?.message?.includes('HTTP 401')) {
        throw transactionsResult.reason;
      } else {
        setTransactions([]);
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else if (!statsResult.reason?.message?.includes('HTTP 401')) {
        throw statsResult.reason;
      } else {
        setStats({
          rewardsEarned: 0,
          securityLevel: '3D Secure',
          totalSpent: 0,
          cardsIssued: 0,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load cards data');
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refetch = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  return {
    products,
    applications,
    virtualCard,
    transactions,
    stats,
    loading,
    error,
    refetch,
  };
}