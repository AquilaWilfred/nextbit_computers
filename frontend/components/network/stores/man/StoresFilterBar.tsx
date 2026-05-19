"use client";

import { memo } from "react";
import { TabsFilter } from "./TabsFilter";
import { SearchBar } from "./SearchBar";
import { Tab } from "@/types/network/stores/man.types";

interface StoresFilterBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export const StoresFilterBar = memo(function StoresFilterBar({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
}: StoresFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
      <TabsFilter activeTab={activeTab} onTabChange={onTabChange} />
      <SearchBar value={search} onChange={onSearchChange} />
    </div>
  );
});