// components/about/FeaturesList.tsx
"use client";

import { FC } from "react";
import { StoreFeature } from "@/types/settings.types";
import { FeatureCard } from "./FeatureCard";

interface FeaturesListProps {
  features: StoreFeature[];
}

export const FeaturesList: FC<FeaturesListProps> = ({ features }) => {
  return (
    <section aria-label="Store features">
      <ol className="space-y-8 list-none p-0 m-0">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} index={idx} />
        ))}
      </ol>
    </section>
  );
};