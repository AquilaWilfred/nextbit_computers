import { useState, useEffect, useMemo } from "react";
import { Product, SortConfig } from "@/types/products/man/products.types";
import { sortProducts } from "@/lib/utils/products/man/man.products.utils";
import { DEFAULT_ITEMS_PER_PAGE } from "@/constants/products/man/man.products.constants";

export function useProductFilters(products: Product[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, itemsPerPage, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedProducts = useMemo(() => {
    return sortProducts(products, sortConfig);
  }, [products, sortConfig]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedProducts.slice(start, start + itemsPerPage);
  }, [sortedProducts, page, itemsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalItems = sortedProducts.length;

  return {
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    itemsPerPage,
    setItemsPerPage,
    sortConfig,
    handleSort,
    sortedProducts,
    paginatedProducts,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  };
}