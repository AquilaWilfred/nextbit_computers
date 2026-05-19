// components/BrandMarquee.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fallbackBrands } from "@/constants/homeConstants";

interface BrandMarqueeProps {
  brands?: string[];
}

export function BrandMarquee({ brands }: BrandMarqueeProps) {
  const displayBrands = brands?.length ? brands : fallbackBrands;
  const repeatedBrands = [...displayBrands, ...displayBrands, ...displayBrands, ...displayBrands];

  return (
    <section className="py-10 border-b border-border bg-background overflow-hidden flex flex-col justify-center" aria-label="Supported brands">
      <div className="relative flex w-full overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div className="flex w-max items-center animate-marquee hover:[animation-play-state:paused] py-4" style={{ willChange: "transform" }}>
          {repeatedBrands.map((brand, idx) => {
            const iconSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
            return (
              <Link
                key={idx}
                href={`/products?brand=${encodeURIComponent(brand)}`}
                className="mx-3 block"
                aria-label={`Shop ${brand} products`}
              >
                <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-[var(--brand)]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-40 sm:w-48 h-32 cursor-pointer">
                  <div className="absolute inset-0 flex items-center justify-center p-6 pb-10">
                    <img
                      src={`https://cdn.simpleicons.org/${iconSlug}`}
                      alt={`${brand} logo`}
                      className="w-full h-full object-contain opacity-40 grayscale contrast-0 dark:brightness-200 group-hover:opacity-100 group-hover:grayscale-0 group-hover:contrast-100 dark:group-hover:brightness-100 transition-all duration-500"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      loading="lazy"
                      decoding="async"
                      width={80}
                      height={40}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                    <span className="font-display font-bold text-sm tracking-widest text-foreground uppercase relative z-10 flex items-center justify-center gap-1 transition-colors group-hover:text-[var(--brand)]">
                      {brand} <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scroll-x { 0%{transform:translateX(0%)} 100%{transform:translateX(-50%)} }
          .animate-marquee { animation: scroll-x 40s linear infinite; }
        `,
      }} />
    </section>
  );
}