"use client";

import { useState } from "react";
import Head from "next/head";
import { useBrands } from "@/hooks/brands/useBrands";
import { useBrandFilters } from "@/hooks/brands/useBrandFilters";
import { BrandHeader } from "@/components/brands/BrandHeader";
import { BrandForm } from "@/components/brands/BrandForm";
import { CategoryFilter } from "@/components/brands/CategoryFilter";
import { BrandGrid } from "@/components/brands/BrandGrid";
import { PresetBrands } from "@/components/brands/PresetBrands";
import { getCategoryForBrand } from "@/lib/utils/brand.utils";

export default function AdminBrandsPage() {
  const [newBrand, setNewBrand] = useState("");
  const { brands, isLoading, isSaving, addBrand, removeBrand, addPresetBrand } = useBrands();
  const { search, setSearch, activeCategory, setActiveCategory, filteredBrands } = useBrandFilters(brands);

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addBrand(newBrand);
    if (success) setNewBrand("");
  };

  const handleRemoveBrand = async (name: string) => {
    await removeBrand(name);
  };

  const handleAddPreset = async (name: string) => {
    await addPresetBrand(name);
  };

  // Apply category filter after search
  const finalFilteredBrands = filteredBrands.filter((brand) => {
    if (activeCategory === "All") return true;
    return getCategoryForBrand(brand) === activeCategory;
  });

  return (
    <>
      <Head>
        <title>Brands Management | Admin Dashboard</title>
        <meta
          name="description"
          content="Manage product brands across electronics, networking, servers, and more."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div>
        <div className="space-y-8 max-w-5xl">
          <BrandHeader brandCount={brands.length} />

          <BrandForm
            newBrand={newBrand}
            onNewBrandChange={setNewBrand}
            onAddBrand={handleAddBrand}
            search={search}
            onSearchChange={setSearch}
            isSaving={isSaving}
          />

          <CategoryFilter
            brands={brands}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <BrandGrid
            brands={finalFilteredBrands}
            isLoading={isLoading}
            onRemove={handleRemoveBrand}
          />

          <PresetBrands brands={brands} onAddPreset={handleAddPreset} />
        </div>
      </div>
    </>
  );
}