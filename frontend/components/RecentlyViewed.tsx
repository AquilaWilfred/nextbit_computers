// components/RecentlyViewed.tsx
"use client";

import ProductCard from "@/components/ProductCard";
import { RecentProduct } from "@/lib/ux";
import { Product } from "@/types/home.types";

interface RecentlyViewedProps {
  products: RecentProduct[];
}

export function RecentlyViewed({ products }: RecentlyViewedProps) {
  if (!products.length) return null;

  return (
    <section className="py-16 bg-muted/20 border-t border-border" aria-labelledby="recent-heading">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[var(--brand)] mb-1">Pick up where you left off</p>
            <h2 id="recent-heading" className="font-display text-2xl sm:text-3xl font-bold">Recently Viewed</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={`recent-${product.id}`} product={product as Product} />
          ))}
        </div>
      </div>
    </section>
  );
}