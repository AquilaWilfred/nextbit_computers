"use client";

import { memo } from "react";
import { Tab } from "@/types/network/stores/man.types";
import { TABS } from "@/constants/network/stores/man.constants";

interface TabsFilterProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const TabsFilter = memo(function TabsFilter({ activeTab, onTabChange }: TabsFilterProps) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});