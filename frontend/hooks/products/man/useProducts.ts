import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/types/products/man/products.types";
import { apiFetch } from "@/lib/utils/products/man/man.products.utils";
import { POLLING_INTERVAL } from "@/constants/products/man/man.products.constants";

export function useProducts(debouncedSearch: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProducts = useCallback(async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await apiFetch<Product[]>(`/api/admin/products?${params}`);
      setProducts(data);
    } catch (error) {
      // retain stale on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchProducts(debouncedSearch || undefined);
  }, [debouncedSearch, fetchProducts]);

  // Polling
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchProducts(debouncedSearch || undefined);
    }, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [debouncedSearch, fetchProducts]);

  const updateProductOptimistically = useCallback((id: number, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const addProductOptimistically = useCallback((product: Product) => {
    setProducts((prev) => [product, ...prev]);
  }, []);

  const removeProductOptimistically = useCallback((id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    isLoading,
    fetchProducts,
    updateProductOptimistically,
    addProductOptimistically,
    removeProductOptimistically,
  };
}