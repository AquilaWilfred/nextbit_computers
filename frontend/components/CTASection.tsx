// components/CTASection.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface CTASectionProps {
  ctaTitle: string;
  ctaDescription: string;
}

export function CTASection({ ctaTitle, ctaDescription }: CTASectionProps) {
  return (
    <section className="py-24 relative overflow-hidden bg-zinc-950 dark:bg-zinc-900 border-t border-border mt-10" aria-labelledby="cta-heading">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[var(--brand)]/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container relative z-10 text-center text-white">
        <h2 id="cta-heading" className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          {ctaTitle}
        </h2>
        <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          {ctaDescription}
        </p>
        <Link href="/products">
          <Button size="lg" className="bg-[var(--brand)] text-white hover:opacity-90 font-semibold gap-2 h-12 px-8 rounded-full text-base transition-transform hover:scale-105 shadow-lg">
            <ShoppingBag className="w-5 h-5" /> Start Shopping
          </Button>
        </Link>
      </div>
    </section>
  );
}