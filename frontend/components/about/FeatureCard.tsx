// components/about/FeatureCard.tsx
"use client";

import { FC } from "react";
import { CheckCircle } from "lucide-react";
import { dynamicIconMap } from "@/lib/iconMap";
import { StoreFeature } from "@/types/settings.types";

interface FeatureCardProps {
  feature: StoreFeature;
  index: number;
}

export const FeatureCard: FC<FeatureCardProps> = ({ feature, index }) => {
  const Icon = dynamicIconMap[feature.icon] || CheckCircle;

  return (
    <li
      id={`feature-${index}`}
      className="bg-card border border-border rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-start gap-6 lg:gap-8 shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      <div
        className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-8 h-8 text-[var(--brand)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold font-display mb-2">{feature.title}</h2>
        <h3 className="text-sm font-medium text-[var(--brand)] mb-4">{feature.desc}</h3>
        <p className="text-muted-foreground leading-relaxed text-base">
          {feature.content ||
            "Learn more about our incredible store features and how we prioritize your shopping experience."}
        </p>
      </div>
    </li>
  );
};