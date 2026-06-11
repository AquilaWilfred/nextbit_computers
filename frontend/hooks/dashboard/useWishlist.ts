import { useState, useEffect } from "react";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { WishlistItem } from "@/types/dashboard/dashboard.types";

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardService.getWishlist();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch wishlist:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  return { items, isLoading };
}