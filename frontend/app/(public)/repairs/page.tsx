// app/(public)/repairs/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import RepairsClient from "./RepairsClient";

export const metadata: Metadata = {
  title: "Repair & Parts Marketplace | NextBit Computer",
  description: "Find trusted laptop repair technicians in Nairobi, buy genuine spare parts, and track your repairs with warranty protection.",
};

function RepairsSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent" />
    </div>
  );
}

export default function RepairsPage() {
  return (
    <Suspense fallback={<RepairsSkeleton />}>
      <RepairsClient />
    </Suspense>
  );
}