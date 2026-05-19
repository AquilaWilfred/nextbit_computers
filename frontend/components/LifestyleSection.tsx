// components/LifestyleSection.tsx
"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { dynamicIconMap } from "@/lib/iconMap";
import { fallbackLifestyles } from "@/constants/homeConstants";
import { Lifestyle } from "@/types/home.types";

interface LifestyleSectionProps {
  lifestyles?: Lifestyle[];
}

export function LifestyleSection({ lifestyles = fallbackLifestyles }: LifestyleSectionProps) {
  return (
    <section id="shop-by-lifestyle" className="py-20 scroll-mt-20" aria-labelledby="lifestyle-heading">
      <div className="container">
        <div className="text-center mb-10">
          <h2 id="lifestyle-heading" className="font-display text-3xl font-bold">A Laptop for Every Lifestyle</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Whether you&apos;re a creative professional, a hardcore gamer, or a student, find the perfect machine tailored to your needs.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lifestyles.map((lifestyle) => {
            const Icon = dynamicIconMap[lifestyle.icon] || Package;
            return (
              <Link key={lifestyle.title} href={lifestyle.link} className="block">
                <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-[var(--brand)]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-36 sm:h-40 cursor-pointer">
                  <div className="absolute inset-0 flex items-center justify-center p-6 pb-12">
                    <Icon className="w-full h-full opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 text-foreground group-hover:text-[var(--brand)]" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent opacity-90 group-hover:from-[var(--brand)]/90 group-hover:via-[var(--brand)]/30 group-hover:opacity-100 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-center flex flex-col items-center justify-end">
                    <h3 className="font-display font-bold text-sm sm:text-base tracking-widest text-foreground uppercase relative z-10 flex items-center justify-center gap-1 transition-colors group-hover:text-white">
                      {lifestyle.title} <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 relative z-10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 px-2 line-clamp-1 group-hover:text-white/80">
                      {lifestyle.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}