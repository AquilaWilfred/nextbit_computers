// app/(public)/page.tsx
"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoreLoader from "@/components/StoreLoader";

// Hooks
import { useHomeData } from "@/hooks/home/useHomeData";
import { useBranchFilter } from "@/hooks/home/useBranchFilter";
import { useBranchGeolocation } from "@/hooks/home/useBranchGeolocation";
import { useCarousel } from "@/hooks/home/useCarousel";
import { useRecentlyViewed } from "@/hooks/home/useRecentlyViewed";
import { useJsonLd } from "@/hooks/home/useJsonLd";

// Components
import { HeroSection } from "@/components/HeroSection";
import { FeaturesBar } from "@/components/FeaturesBar";
import { BrandMarquee } from "@/components/BrandMarquee";
import { CategoriesSection } from "@/components/CategoriesSection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { LatestProducts } from "@/components/LatestProducts";
import { LifestyleSection } from "@/components/LifestyleSection";
import { LocationSection } from "@/components/LocationSection";
import { CTASection } from "@/components/CTASection";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { FloatingAnnouncement } from "@/components/FloatingAnnouncement";
import { PromotionsBar } from "@/components/PromotionsBar";
import { JsonLdScripts } from "@/components/JsonLdScripts";

// Utils
import { extractSettings } from "@/lib/utils/homeHelpers";

// Lazy load map
const MapView = dynamic(
  () => import("@/components/map/MapView").then((mod) => ({ default: mod.MapView })),
  { ssr: false, loading: () => <Skeleton className="w-full h-96" /> }
);

export default function Home() {
  // Data fetching
  const {
    branches,
    featuredProducts,
    latestProducts,
    banners,
    promotions,
    categories,
    settings,
    announcements,
    liveStats,
    isLoading,
  } = useHomeData();

  // UI state
  const mapRef = useRef(null);
  const carousel = useCarousel({ items: banners });
  const recentProducts = useRecentlyViewed();

  // Branch logic
  const branchFilter = useBranchFilter({ branches });
  const { selectedBranch, setSelectedBranch, mapCenter } = useBranchGeolocation({
    branches,
    filteredBranches: branchFilter.filteredBranches,
    mapRef,
  });

  // JSON-LD for SEO
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { heroTitle, heroDescription, ctaTitle, ctaDescription, storeName, heroBadge, lifestyles, storeDesc } = extractSettings(settings);
  const jsonLdData = useJsonLd({ storeName, storeDesc, featuredProducts, origin });

  // Handlers
  const handleMarkerClick = (id: number) => {
    const branch = branches?.find((b) => b.id === id);
    if (branch) setSelectedBranch(branch);
  };

  if (isLoading) {
    return <StoreLoader fullScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLdScripts data={jsonLdData} />
      <Navbar />

      {promotions && promotions.length > 0 && <PromotionsBar promotions={promotions} />}

      <HeroSection
        heroTitle={heroTitle}
        heroDescription={heroDescription}
        heroBadge={heroBadge}
        banners={banners}
        carousel={carousel}
        liveStats={liveStats}
        settings={settings}
      />

      <FeaturesBar settings={settings} />
      <BrandMarquee brands={settings?.brands} />
      <CategoriesSection categories={categories} loading={isLoading} />
      <FeaturedProducts products={featuredProducts} loading={isLoading} />
      <LatestProducts products={latestProducts} loading={isLoading} />
      <LifestyleSection lifestyles={lifestyles} />

      <LocationSection
        branches={branches}
        filteredBranches={branchFilter.filteredBranches}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        onMarkerClick={handleMarkerClick}
        mapRef={mapRef}
        mapCenter={mapCenter}
        searchQuery={branchFilter.searchQuery}
        onSearchChange={branchFilter.setSearchQuery}
        statusFilter={branchFilter.statusFilter}
        onStatusFilterChange={branchFilter.setStatusFilter}
        MapComponent={MapView}
      />

      <CTASection ctaTitle={ctaTitle} ctaDescription={ctaDescription} />
      
      {recentProducts.length > 0 && <RecentlyViewed products={recentProducts} />}
      
      <FloatingAnnouncement announcements={announcements} />
      <Footer />
    </div>
  );
}