// components/PartsShop.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Cpu, Package, AlertTriangle } from "lucide-react";
import PartCard from "@/components/PartCard";
import { PartCategoryIcon } from "./PartCategoryIcon";
import { ConditionBadge } from "./ConditionBadge";
import { PART_CATEGORIES } from "@/constants/repairs.constants";
import { SparePart, PartTab } from "@/types/repairs.types";

interface PartsShopProps {
  parts: SparePart[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  partTab: PartTab;
  setPartTab: (tab: PartTab) => void;
}

export function PartsShop({
  parts,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  partTab,
  setPartTab,
}: PartsShopProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts or model numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {["all", ...PART_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === cat
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      <div className="flex gap-0 border-b">
        {(["genuine", "aftermarket", "used"] as PartTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPartTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              partTab === t
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "genuine" ? "Genuine OEM" : t === "aftermarket" ? "Aftermarket" : "Tested Used"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>All parts carry a 30-day return window. OEM and new parts include a 90-day warranty.</span>
      </div>

      {parts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No parts match your search.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {parts.map((part) => (
            <PartCard key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  );
}