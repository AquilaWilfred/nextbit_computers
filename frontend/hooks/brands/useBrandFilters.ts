import { useState, useMemo } from "react";

export function useBrandFilters(brands: string[]) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const matchesSearch = brand.toLowerCase().includes(search.toLowerCase());
      // Category filtering is handled in the component since it needs getCategoryForBrand
      return matchesSearch;
    });
  }, [brands, search]);

  return {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    filteredBrands,
  };
}