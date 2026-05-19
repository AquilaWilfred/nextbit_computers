// components/JsonLdScripts.tsx
"use client";

interface JsonLdData {
  jsonLd: any;
  orgJsonLd: any;
  productListJsonLd: any;
}

export function JsonLdScripts({ data }: { data: JsonLdData }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.orgJsonLd) }} />
      {data.productListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.productListJsonLd) }} />
      )}
    </>
  );
}