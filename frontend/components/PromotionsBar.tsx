// components/PromotionsBar.tsx
"use client";

import { Promotion } from "@/types/home.types";

interface PromotionsBarProps {
  promotions: Promotion[];
}

export function PromotionsBar({ promotions }: PromotionsBarProps) {
  if (!promotions.length) return null;

  return (
    <div
      className="text-white py-2.5 px-4 text-center text-sm font-medium relative z-10"
      style={{ backgroundColor: "var(--promo-banner, var(--brand))" }}
      role="banner"
      aria-label="Promotions"
    >
      <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
              {p.title}
            </span>
            <span>{p.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}