// components/listings/TradeInSkeleton.tsx
"use client";

import { FC } from 'react';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const TradeInSkeleton: FC = () => {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <div className="h-6 w-32 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-40 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-36 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-40 bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* How It Works Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border-l-2 border-gray-200 pl-3">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Listings Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white">
              <div className="flex gap-5">
                <div className="w-28 h-28 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
                      <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
};