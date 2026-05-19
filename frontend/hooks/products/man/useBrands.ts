import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/utils/products/man/man.products.utils";

const DEFAULT_BRANDS = ["Samsung", "Dell", "HP", "Lenovo", "Asus"];

export function useBrands() {
  const [brands, setBrands] = useState<string[]>(DEFAULT_BRANDS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ brands?: string[] }>("/api/settings/public?keys=brands")
      .then((data) => {
        if (data.brands?.length) setBrands(data.brands);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { brands, isLoading };
}