// components/about/AboutSkeleton.tsx
"use client";

import { FC } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const AboutSkeleton: FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container flex-1 py-12 lg:py-20 max-w-4xl mx-auto">
        {/* Hero Skeleton */}
        <header className="text-center mb-16">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </header>

        {/* Features Skeleton */}
        <section aria-label="Store features">
          <div className="space-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-start gap-6 lg:gap-8"
              >
                <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};