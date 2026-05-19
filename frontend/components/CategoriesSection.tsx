// components/CategoriesSection.tsx
"use client";

import Link from "next/link";
import { ChevronRight, Monitor, Cpu, Headphones, Package, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { dynamicIconMap } from "@/lib/iconMap";
import { categoryGradients } from "@/constants/homeConstants";
import { Category } from "@/types/home.types";

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  if (loading) {
    return (
      <section className="py-16">
        <div className="container">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-[16/9] rounded-3xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  const getIcon = (cat: Category) => {
    if (cat.icon) return dynamicIconMap[cat.icon] || Package;
    if (cat.name.toLowerCase().includes("laptop")) return Monitor;
    if (cat.name.toLowerCase().includes("desktop")) return Cpu;
    return Headphones;
  };

  return (
    <section className="py-16" aria-labelledby="categories-heading">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[var(--brand)] mb-1">Browse by Category</p>
            <h2 id="categories-heading" className="font-display text-2xl sm:text-3xl font-bold">Shop by Category</h2>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--brand)] transition-colors">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {categories.map((cat, i) => {
            const style = categoryGradients[i % categoryGradients.length];
            const Icon = getIcon(cat);
            return (
              <Link key={i} href={`/products?category=${cat.slug}`}>
                <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${style.gradient} border border-border hover:border-[var(--brand)]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}>
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={cat.imageUrl || "/assets/placeholder.png"}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={225}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className={`w-9 h-9 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center mb-2.5 ${style.iconColor}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-display font-bold text-lg">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-[var(--brand)] text-sm font-medium">
                      Shop now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
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