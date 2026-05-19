import { useState, useMemo } from "react";
import { Branch, Tab } from "@/types/network/stores/man.types";
import { filterStores } from "@/lib/utils/network/stores/man.utils";

export function useStoreFilter(branches: Branch[]) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const filteredStores = useMemo(() => {
    return filterStores(branches, tab, search);
  }, [branches, tab, search]);

  return {
    tab,
    setTab,
    search,
    setSearch,
    filteredStores,
  };
}