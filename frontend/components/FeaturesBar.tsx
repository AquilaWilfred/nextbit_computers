// components/FeaturesBar.tsx
"use client";

import Link from "next/link";
import { dynamicIconMap } from "@/lib/iconMap";
import { fallbackFeatures } from "@/constants/homeConstants";
import { formatPrice } from "@/lib/utils/homeHelpers";
import { Settings } from "@/types/home.types";

interface FeaturesBarProps {
  settings?: Settings;
}

export function FeaturesBar({ settings }: FeaturesBarProps) {
  const features = (settings?.general?.features as any[]) || fallbackFeatures;
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold;

  const processedFeatures = features.map((f) => {
    if (f.title === "Free Shipping" && freeShippingThreshold) {
      return { ...f, desc: `Orders over ${formatPrice(freeShippingThreshold)}` };
    }
    return f;
  });

  return (
    <section className="border-b border-border bg-card" aria-label="Store features">
      <div className="container py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {processedFeatures.map((f, idx) => {
            const Icon = dynamicIconMap[f.icon] || (() => null);
            return (
              <Link key={idx} href={`/about#feature-${idx}`}>
                <div className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand)]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[var(--brand)] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-[var(--brand)] transition-colors">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
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