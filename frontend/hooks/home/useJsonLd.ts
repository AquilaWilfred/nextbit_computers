// hooks/useJsonLd.ts
import { useMemo } from "react";
import { Product } from "@/types/home.types";

export function useJsonLd({ storeName, storeDesc, featuredProducts, origin }: {
  storeName: string;
  storeDesc: string;
  featuredProducts?: Product[];
  origin?: string;
}) {
  const baseUrl = origin || (typeof window !== "undefined" ? window.location.origin : "");

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeName,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }), [storeName, baseUrl]);

  const orgJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: baseUrl,
    description: storeDesc,
  }), [storeName, baseUrl, storeDesc]);

  const productListJsonLd = useMemo(() => {
    if (!featuredProducts?.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Featured Products — ${storeName}`,
      itemListElement: featuredProducts.slice(0, 8).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${baseUrl}/products/${p.id}`,
        name: p.name,
      })),
    };
  }, [featuredProducts, storeName, baseUrl]);

  return { jsonLd, orgJsonLd, productListJsonLd };
}