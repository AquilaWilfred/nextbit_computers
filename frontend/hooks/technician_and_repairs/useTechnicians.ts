// hooks/useTechnicians.ts
import { useState, useEffect, useMemo } from "react";
import { Technician } from "@/types/repairs.types";
import { filterTechnicians, sortTechnicians } from "@/lib/utils/repairs.utils";

export function useTechnicians(userId?: number) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpec, setActiveSpec] = useState("all");
  const [sortKey, setSortKey] = useState<"rating" | "distance" | "price" | "jobs">("rating");

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch("/api/repairs/technicians");
        if (!response.ok) throw new Error("Failed to fetch technicians");
        const data = await response.json();
        setTechnicians(data);
      } catch (error) {
        console.error("Failed to load technicians", error);
        // Fallback to mock data if needed
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicians();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterTechnicians(technicians, searchQuery, activeSpec);
    return sortTechnicians(filtered, sortKey);
  }, [technicians, searchQuery, activeSpec, sortKey]);

  return {
    technicians: filteredAndSorted,
    loading,
    searchQuery,
    setSearchQuery,
    activeSpec,
    setActiveSpec,
    sortKey,
    setSortKey,
    totalCount: filteredAndSorted.length,
  };
}