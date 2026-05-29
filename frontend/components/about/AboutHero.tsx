// components/about/AboutHero.tsx
"use client";

import { FC } from "react";

interface AboutHeroProps {
  storeName: string;
  storeDescription: string;
}

export const AboutHero: FC<AboutHeroProps> = ({ storeName, storeDescription }) => {
  return (
    <header className="text-center mb-16">
      <h1 className="font-display text-4xl lg:text-5xl font-bold mb-4">
        About {storeName}
      </h1>
      <p className="text-lg text-muted-foreground">{storeDescription}</p>
    </header>
  );
};