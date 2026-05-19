// hooks/useParts.ts
import { proxyClient } from "@/lib/api-client";
import { useState, useEffect, useMemo } from "react";
import { SparePart, PartTab } from "@/types/repairs.types";

export function useParts() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ADD for debugging
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [partTab, setPartTab] = useState<PartTab>("genuine");

  const conditionMap: Record<PartTab, string[]> = {
    genuine: ["oem", "new"],
    aftermarket: ["aftermarket"],
    used: ["used"],
  };

  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // CHANGE: Use proxyClient instead of fetch
        const data = await proxyClient.get<SparePart[]>("/api/repairs/parts");
        
        setParts(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch parts";
        setError(errorMessage);
        console.error("Failed to load parts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchParts();
  }, []);

  const filteredParts = useMemo(() => {
    const conditions = conditionMap[partTab];
    return parts.filter((p) => {
      const matchCategory = activeCategory === "all" || p.category === activeCategory;
      const matchCondition = conditions.includes(p.condition);
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.compatibility.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchCondition && matchSearch;
    });
  }, [parts, searchQuery, activeCategory, partTab]);

  return {
    parts: filteredParts,
    loading,
    error, // ADD for debugging
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    partTab,
    setPartTab,
  };
}