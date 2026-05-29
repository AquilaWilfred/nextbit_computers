"use client";

import { FC } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Skeleton } from '@/components/ui/skeleton';

export const CardsSkeleton: FC = () => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-gray-300 text-sm tracking-widest uppercase">Loading your financial suite…</p>
        </div>
      </div>
      <Footer />
    </>
  );
};