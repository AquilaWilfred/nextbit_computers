// components/HeroSection.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { Banner, LiveStats, Settings } from "@/types/home.types";
import { formatPrice } from "@/lib/utils/homeHelpers";

interface HeroSectionProps {
  heroTitle: string;
  heroDescription: string;
  heroBadge: string;
  banners: Banner[];
  carousel: {
    activeIndex: number;
    isHovered: boolean;
    setIsHovered: (val: boolean) => void;
    touchHandlers: any;
  };
  liveStats?: LiveStats;
  settings?: Settings;
}

export function HeroSection({ 
  heroTitle, 
  heroDescription, 
  heroBadge, 
  banners, 
  carousel,
  liveStats,
  settings 
}: HeroSectionProps) {
  const totalBanners = banners.length;
  const activeBanner = banners[carousel.activeIndex];

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden bg-gradient-to-br from-background via-background to-[var(--brand)]/5 border-b border-border"
      onMouseEnter={() => carousel.setIsHovered(true)}
      onMouseLeave={() => carousel.setIsHovered(false)}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,white_30%,transparent_100%)]" />
        <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-[var(--brand)]/10 blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-[24rem] h-[24rem] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <div className="container relative pt-6 pb-12 lg:pt-10 lg:pb-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:mt-6">
          {/* Left Column - Text Content */}
          <div className="space-y-5">
            <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20">
              <Zap className="w-3 h-3 mr-1" aria-hidden="true" />
              {heroBadge}
            </Badge>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
              {heroTitle}
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {heroDescription}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg" className="bg-[var(--brand)] text-white hover:opacity-90 gap-2">
                  <ShoppingBag className="w-4 h-4" /> Shop Now
                </Button>
              </Link>
              <Link href="/products?featured=true">
                <Button size="lg" variant="outline" className="gap-2">
                  View Deals <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
              <div>
                <p className="font-display font-bold text-2xl">{liveStats?.products ?? 0}+</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="font-display font-bold text-2xl">{liveStats?.customers ?? 0}+</p>
                <p className="text-xs text-muted-foreground">Happy Customers</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="font-display font-bold text-2xl">4.9★</p>
                <p className="text-xs text-muted-foreground">Avg. Rating</p>
              </div>
            </div>
          </div>

          {/* Right Column - Carousel */}
          <div
            className="relative flex h-[350px] sm:h-[450px] lg:h-[500px] xl:h-[600px] w-full items-center justify-center mt-8 lg:mt-0 touch-pan-y"
            {...carousel.touchHandlers}
            aria-label="Featured product carousel"
            role="region"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full bg-[var(--brand)]/10 blur-[100px] pointer-events-none" />

            {banners.map((banner, index) => {
              const offset = (index - carousel.activeIndex + totalBanners) % totalBanners;
              let positionClass = "opacity-0 scale-75 pointer-events-none z-0";
              let animDelay = "0s";

              if (totalBanners === 1) {
                if (offset === 0) positionClass = "z-20 scale-100 opacity-100";
              } else if (totalBanners === 2) {
                if (offset === 0) {
                  positionClass = "z-20 scale-100 translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-6 opacity-100";
                } else if (offset === 1) {
                  positionClass = "z-10 scale-90 -translate-x-8 sm:-translate-x-12 translate-y-6 sm:translate-y-10 opacity-95";
                  animDelay = "1.5s";
                }
              } else {
                if (offset === 0) {
                  positionClass = "z-30 scale-100 translate-x-0 translate-y-0 opacity-100";
                } else if (offset === 1) {
                  positionClass = "z-20 scale-90 -translate-x-12 sm:-translate-x-28 translate-y-8 sm:translate-y-16 opacity-95";
                  animDelay = "1s";
                } else if (offset === 2) {
                  positionClass = "z-10 scale-90 translate-x-12 sm:translate-x-28 -translate-y-8 sm:-translate-y-16 opacity-90";
                  animDelay = "2s";
                }
              }

              return (
                <article
                  key={banner.id}
                  className={`absolute bg-card rounded-3xl shadow-2xl p-3 sm:p-4 w-[280px] sm:w-[320px] lg:w-[340px] xl:w-[440px] transition-all duration-700 ease-in-out hover:!z-40 hover:!scale-105 border border-border/50 group ${positionClass}`}
                  style={{ animation: `float 6s ease-in-out infinite`, animationDelay: animDelay }}
                  aria-hidden={offset !== 0}
                >
                  <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted mb-4 border border-border/30">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      fetchPriority={index === 0 ? "high" : "auto"}
                      decoding={index === 0 ? "sync" : "async"}
                      loading={index === 0 ? "eager" : "lazy"}
                      width={440}
                      height={330}
                    />
                  </div>
                  <div className="space-y-1 px-1 text-center">
                    <h2 className="font-display font-bold text-base sm:text-lg xl:text-xl leading-tight group-hover:text-[var(--brand)] transition-colors">
                      {banner.title}
                    </h2>
                    {banner.description && (
                      <p className="text-xs sm:text-sm xl:text-base text-muted-foreground line-clamp-2">
                        {banner.description}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        `,
      }} />
    </section>
  );
}