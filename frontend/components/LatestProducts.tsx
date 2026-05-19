// components/LatestProducts.tsx
"use client";

import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/home.types";

interface LatestProductsProps {
  products?: Product[];
  loading: boolean;
}

export function LatestProducts({ products, loading }: LatestProductsProps) {
  if (loading) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products?.length) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="container">
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products yet. Products will appear here once added.</p>
            <Link href="/admin">
              <Button className="mt-4 bg-[var(--brand)] text-white hover:opacity-90">Go to Admin Panel</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 relative overflow-hidden" aria-labelledby="latest-heading">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute -right-40 bottom-40 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container relative z-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[var(--brand)] mb-1">Just arrived</p>
            <h2 id="latest-heading" className="font-display text-2xl sm:text-3xl font-bold">Latest Products</h2>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--brand)] transition-colors">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}