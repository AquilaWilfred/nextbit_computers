// hooks/useRecentlyViewed.ts
import { useState, useEffect } from "react";
import { getRecentlyViewed, RecentProduct } from "@/lib/ux";

export function useRecentlyViewed() {
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setRecentProducts(getRecentlyViewed());
  }, []);

  return recentProducts;
}