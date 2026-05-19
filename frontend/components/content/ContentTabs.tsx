"use client";

import { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TAB_ITEMS } from "@/constants/content.constants";

interface ContentTabsProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ContentTabs = memo(function ContentTabs({ value, onValueChange }: ContentTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {TAB_ITEMS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="capitalize data-[state=active]:bg-[var(--brand)] data-[state=active]:text-white"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
});