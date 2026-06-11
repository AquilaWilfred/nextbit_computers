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
      <script key="jsonLd" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }} />
      <script key="orgJsonLd" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.orgJsonLd) }} />
      {data.productListJsonLd && (
        <script key="productListJsonLd" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.productListJsonLd) }} />
      )}
    </>
  );
}