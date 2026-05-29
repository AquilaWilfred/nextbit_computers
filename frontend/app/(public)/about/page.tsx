// app/(public)/about/page.tsx
"use client";

import { useGeneralSettings } from "@/hooks/settings/useGeneralSettings";
import { useHashScroll } from "@/hooks/about/useHashScroll";
import { AboutSkeleton } from "@/components/about/AboutSkeleton";
import { AboutError } from "@/components/about/AboutError";
import { AboutHero } from "@/components/about/AboutHero";
import { FeaturesList } from "@/components/about/FeaturesList";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  const { isLoading, error, getFeatures, getStoreName, getStoreDescription } = useGeneralSettings();
  
  // Handle hash scrolling
  useHashScroll();

  if (isLoading) {
    return <AboutSkeleton />;
  }

  if (error) {
    return (
      <AboutError 
        error={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  const features = getFeatures();
  const storeName = getStoreName();
  const storeDescription = getStoreDescription();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="container flex-1 py-12 lg:py-20 max-w-4xl mx-auto">
        <AboutHero 
          storeName={storeName} 
          storeDescription={storeDescription} 
        />
        
        <FeaturesList features={features} />
      </main>
      
      <Footer />
    </div>
  );
}