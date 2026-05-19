// hooks/useHomeData.ts
import { useFetch } from "@/hooks/home/useFetch";
import { API_ENDPOINTS } from "@/constants/homeConstants";
import { Branch, Product, Banner, Promotion, Category, Settings, LiveStats } from "@/types/home.types";
import { useAnnouncements } from "./useAnnouncements";

export function useHomeData() {
  const { data: branches } = useFetch<Branch[]>(API_ENDPOINTS.branches, { staleTime: 1000 * 60 * 5 });
  const { data: featuredProducts, isLoading: loadingFeatured } = useFetch<Product[]>(
    API_ENDPOINTS.featuredProducts,
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: latestProducts, isLoading: loadingLatest } = useFetch<Product[]>(
    API_ENDPOINTS.latestProducts,
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: banners, isLoading: loadingBanners } = useFetch<Banner[]>(
    API_ENDPOINTS.banners,
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: promotions } = useFetch<Promotion[]>(
    API_ENDPOINTS.promotions,
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: dbCategories, isLoading: loadingCategories } = useFetch<Category[]>(
    API_ENDPOINTS.categories,
    { staleTime: 1000 * 60 * 60 }
  );
  const { data: settings, isLoading: loadingSettings } = useFetch<Settings>(
    API_ENDPOINTS.settings,
    { staleTime: Infinity }
  );
  const { data: liveStats } = useFetch<LiveStats>(
    API_ENDPOINTS.stats,
    { staleTime: 1000 * 60 * 5 }
  );
  
  // Real-time announcements
  const { data: announcements } = useAnnouncements(API_ENDPOINTS.announcements);

  const isLoading = loadingSettings || loadingBanners || loadingCategories;

  const activeBanners = (banners ?? []).filter((b) => b.active).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const featuredCategories = (Array.isArray(dbCategories) ? dbCategories : [])
    .filter((c) => c.featured && c.active !== false);

  return {
    branches,
    featuredProducts,
    latestProducts,
    banners: activeBanners,
    promotions,
    categories: featuredCategories,
    settings,
    announcements,
    liveStats,
    isLoading: isLoading || loadingFeatured || loadingLatest,
    loadingFeatured,
    loadingLatest,
    loadingCategories,
  };
}