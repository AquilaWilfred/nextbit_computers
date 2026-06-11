import { useState, useEffect, useRef } from "react";
import { navbarService } from "@/lib/services/navbar/navbar.service";

export function useSearchAutocomplete() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length <= 1) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await navbarService.searchProducts(debouncedQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchResults();
  }, [debouncedQuery]);

  const focusSearch = () => {
    searchRef.current?.focus();
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchRef,
    focusSearch,
  };
}