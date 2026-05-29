"use client";
import {
  Check,
  ChevronDown,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useReducer,
} from "react";
import { useLocation, useSearch, Link } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import StoreLoader from "@/components/StoreLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: unknown;
  brand?: string | null;
  categoryId?: number;
  stock: number;
  isTradeInListing?: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  order?: number;
  active?: boolean;
  imageUrl?: string | null;
}

interface Facets {
  categories: Record<number, number>;
  brands: Record<string, number>;
}

interface PublicSettings {
  brands?: string[];
  general?: { storeName?: string; currency?: string };
}

interface ProductPage {
  items: Product[];
  nextCursor: number | null;
  total?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SORTS = ["newest", "price_asc", "price_desc"] as const;
type SortBy = (typeof VALID_SORTS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildProductQueryString(params: {
  limit?: number;
  cursor?: number | null;
  search?: string;
  featured?: boolean;
  tag?: string;
  categoryIds?: number[];
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: SortBy;
  includeListings?: boolean;
}): string {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.cursor) q.set("cursor", String(params.cursor));
  if (params.search) q.set("search", params.search);
  if (params.featured) q.set("featured", "true");
  if (params.tag) q.set("tag", params.tag);
  if (params.categoryIds?.length)
    params.categoryIds.forEach((id) => q.append("categoryId", String(id)));
  if (params.brand) q.set("brand", params.brand);
  if (params.minPrice) q.set("minPrice", params.minPrice);
  if (params.maxPrice) q.set("maxPrice", params.maxPrice);
  if (params.sortBy && params.sortBy !== "newest") q.set("sortBy", params.sortBy);
  if (params.includeListings) q.set('includeListings', 'true');
  return q.toString();
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Products() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = useMemo(
    () => new URLSearchParams(searchString),
    [searchString]
  );

  // Parse URL params once
  const categorySlug = params.get("category") ?? undefined;
  const categoriesParam = params.get("categories") ?? undefined;
  const searchParam = params.get("search") ?? undefined;
  const featuredParam = params.get("featured") === "true";
  const brandParam = params.get("brand") ?? undefined;
  const minPriceParam = params.get("minPrice") ?? "";
  const maxPriceParam = params.get("maxPrice") ?? "";
  const tagParam = params.get("tag") ?? undefined;
  const sortByParam = (
    VALID_SORTS.includes(params.get("sortBy") as SortBy)
      ? params.get("sortBy")
      : "newest"
  ) as SortBy;

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState(searchParam ?? "");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(brandParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [sortBy, setSortBy] = useState<SortBy>(sortByParam);
  const [tagFilter, setTagFilter] = useState<string | undefined>(tagParam);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  // Guard: don't write URL until we've fully synced from it
  const [syncedUrl, setSyncedUrl] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedMinPrice = useDebounce(minPrice, 400);
  const debouncedMaxPrice = useDebounce(maxPrice, 400);

  // ── Remote data ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({});
  const [facets, setFacets] = useState<Facets>({ categories: {}, brands: {} });

  // Infinite product pages
  const [pages, setPages] = useState<ProductPage[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // Reset pages whenever filters change
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        debouncedSearch,
        featuredParam,
        tagFilter,
        selectedCategories,
        selectedBrand,
        debouncedMinPrice,
        debouncedMaxPrice,
        sortBy,
      }),
    [
      debouncedSearch,
      featuredParam,
      tagFilter,
      selectedCategories,
      selectedBrand,
      debouncedMinPrice,
      debouncedMaxPrice,
      sortBy,
    ]
  );

  const observerTarget = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Static data fetch (once) ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          fetch("/api/categories"),
          fetch("/api/settings/public?keys=brands,general"),
          fetch("/api/products/facets"),
        ]);

        // categories
        if (results[0].status === "fulfilled") {
          try {
            const cats = await results[0].value.json();
            setCategories(Array.isArray(cats) ? cats : []);
          } catch (err) {
            console.error("Failed to parse /api/categories response:", err);
            setCategories([]);
          }
        } else {
          console.error("Failed to fetch /api/categories:", results[0].reason);
          setCategories([]);
        }

        // settings
        if (results[1].status === "fulfilled") {
          try {
            const s = await results[1].value.json();
            setSettings(s || {});
          } catch (err) {
            console.error("Failed to parse /api/settings/public response:", err);
            setSettings({});
          }
        } else {
          console.error("Failed to fetch /api/settings/public:", results[1].reason);
          setSettings({});
        }

        // facets
        if (results[2].status === "fulfilled") {
          try {
            const f = await results[2].value.json();
            setFacets(f ?? { categories: {}, brands: {} });
          } catch (err) {
            console.error("Failed to parse /api/products/facets response:", err);
            setFacets({ categories: {}, brands: {} });
          }
        } else {
          console.error("Failed to fetch /api/products/facets:", results[2].reason);
          setFacets({ categories: {}, brands: {} });
        }
      } catch (e) {
        console.error("Static fetch failed:", e);
        setCategories([]);
        setSettings({});
        setFacets({ categories: {}, brands: {} });
      }
    })();
  }, []);

  // ── URL → State sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!categories.length) return;

    let ids: number[] = [];
    if (categoriesParam) {
      const slugs = categoriesParam.split(",");
      ids = categories.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
    } else if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) ids = [cat.id];
    }

    setSelectedCategories((prev) => {
      if (
        prev.length === ids.length &&
        prev.every((v, i) => v === ids[i])
      )
        return prev;
      return ids;
    });
    setSearch(searchParam ?? "");
    setTagFilter(tagParam);
    setSelectedBrand(brandParam);
    setMinPrice(minPriceParam);
    setMaxPrice(maxPriceParam);
    setSortBy(sortByParam);
    setSyncedUrl(searchString);
  }, [categories, searchString]);

  // Auto-expand selected category parents
  useEffect(() => {
    if (!categories.length || !selectedCategories.length) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      selectedCategories.forEach((catId) => {
        const cat = categories.find((c) => c.id === catId);
        if (!cat) return;
        const parentId = cat.parentId;
        if (parentId) next.add(parentId);
        else next.add(cat.id);
      });
      return Array.from(next);
    });
  }, [selectedCategories, categories]);

  // ── State → URL sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!categories.length || syncedUrl !== searchString) return;

    const current = new URLSearchParams(searchString);
    const next = new URLSearchParams();

    if (search) next.set("search", search);
    if (current.get("featured") === "true") next.set("featured", "true");
    if (selectedBrand) next.set("brand", selectedBrand);
    if (debouncedMinPrice) next.set("minPrice", debouncedMinPrice);
    if (debouncedMaxPrice) next.set("maxPrice", debouncedMaxPrice);
    if (sortBy !== "newest") next.set("sortBy", sortBy);
    if (tagFilter) next.set("tag", tagFilter);

    if (selectedCategories.length > 0) {
      const slugs = categories
        .filter((c) => selectedCategories.includes(c.id))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => c.slug);
      if (slugs.length) next.set("categories", slugs.join(","));
    }

    // Deep compare to avoid infinite loop
    const newKeys = Array.from(next.keys());
    const curKeys = Array.from(current.keys());
    const changed =
      newKeys.length !== curKeys.length ||
      newKeys.some((k) => next.get(k) !== current.get(k));

    if (changed) {
      const qs = next.toString();
      setLocation(qs ? `${location}?${qs}` : location, { replace: true });
    }
  }, [
    search,
    selectedCategories,
    selectedBrand,
    debouncedMinPrice,
    debouncedMaxPrice,
    sortBy,
    tagFilter,
    categories,
    location,
    searchString,
    syncedUrl,
    setLocation,
  ]);

  // ── Products fetch (with abort on filter change) ───────────────────────────
  const categoryIdsToFetch = useMemo(() => {
    if (!selectedCategories.length) return undefined;
    return selectedCategories.flatMap((id) => {
      const children = categories
        .filter((c) => c.parentId === id)
        .map((c) => c.id);
      return [id, ...children];
    });
  }, [selectedCategories, categories]);

  const fetchPage = useCallback(
    async (cursor: number | null, signal: AbortSignal) => {
      const qs = buildProductQueryString({
        limit: 12,
        cursor,
        search: debouncedSearch || undefined,
        featured: featuredParam || undefined,
        tag: tagFilter || undefined,
        categoryIds: categoryIdsToFetch,
        brand: selectedBrand || undefined,
        minPrice: debouncedMinPrice || undefined,
        maxPrice: debouncedMaxPrice || undefined,
        sortBy,
        includeListings: true,
      });
      const res = await fetch(`/api/products/infinite?${qs}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      // API returns either { items, nextCursor, total } or an array
      if (Array.isArray(json)) {
        return { items: json, nextCursor: null } as ProductPage;
      }
      return json as ProductPage;
    },
    [
      debouncedSearch,
      featuredParam,
      tagFilter,
      categoryIdsToFetch,
      selectedBrand,
      debouncedMinPrice,
      debouncedMaxPrice,
      sortBy,
    ]
  );

  // Reset + initial fetch whenever filters change
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPages([]);
    setNextCursor(null);
    setIsLoading(true);

    fetchPage(null, controller.signal)
      .then((data) => {
        setPages([data]);
        setNextCursor(data.nextCursor);
        if (typeof data.total === "number") setTotalCount(data.total);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
    // filterKey is a stable JSON string representing all filter deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          nextCursor !== null &&
          !isFetchingNext
        ) {
          setIsFetchingNext(true);
          const controller = new AbortController();
          fetchPage(nextCursor, controller.signal)
            .then((data) => {
              setPages((prev) => [...prev, data]);
              setNextCursor(data.nextCursor);
              if (typeof data.total === "number") setTotalCount(data.total);
            })
            .catch((err) => {
              if (err.name !== "AbortError") console.error(err);
            })
            .finally(() => setIsFetchingNext(false));
        }
      },
      { rootMargin: "400px" }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [nextCursor, isFetchingNext, fetchPage]);

  // ── Dynamic SEO ────────────────────────────────────────────────────────────
  useEffect(() => {
    const storeName =
      settings?.general?.storeName ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("store_name_cache")
        : null) ||
      "Store";

    let pageTitle = `Shop All Products | ${storeName}`;
    if (debouncedSearch) pageTitle = `Search: ${debouncedSearch} | ${storeName}`;
    else if (selectedCategories.length === 1) {
      const catName = categories.find((c) => c.id === selectedCategories[0])?.name;
      if (catName) pageTitle = `${catName} | ${storeName}`;
    } else if (featuredParam) {
      pageTitle = `Featured Deals | ${storeName}`;
    }

    document.title = pageTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      `Shop ${pageTitle.split(" | ")[0].toLowerCase()} at ${storeName}. Huge selection of premium tech, laptops, and accessories.`
    );
  }, [debouncedSearch, selectedCategories, categories, featuredParam, settings]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const { orderedCategories, rootCategories } = useMemo(() => {
    const active = categories.filter((c) => c.active !== false);
    const ordered = [...active].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const root = ordered.filter((c) => !c.parentId);
    return { orderedCategories: ordered, rootCategories: root };
  }, [categories]);

  const subCategories = useMemo(() => {
    if (selectedCategories.length !== 1) return [];
    const currentCat = categories.find((c) => c.id === selectedCategories[0]);
    return currentCat
      ? orderedCategories.filter((c) => c.parentId === currentCat.id)
      : [];
  }, [selectedCategories, categories, orderedCategories]);

  const sorted = useMemo(
    () => pages.flatMap((p) => p.items),
    [pages]
  );

  // Combine configured brands (settings) with brands seen in product facets
  const availableBrands: string[] = useMemo(() => {
    const fromSettings = Array.isArray(settings?.brands) ? settings!.brands : [];
    const fromFacets = facets && facets.brands ? Object.keys(facets.brands) : [];
    const merged = Array.from(new Set([...fromSettings, ...fromFacets]));
    // sort for stable display: put settings first (in order), then facet-only brands alphabetically
    const settingsSet = new Set(fromSettings.map((b) => b.toLowerCase()));
    const settingsOrdered = merged.filter((b) => settingsSet.has(b.toLowerCase()));
    const facetOnly = merged.filter((b) => !settingsSet.has(b.toLowerCase())).sort((a, z) => a.localeCompare(z));
    return [...settingsOrdered, ...facetOnly];
  }, [settings, facets]);
  const currency = settings?.general?.currency || "$";

  type ActiveFilter = { id: string; label: string; onRemove: () => void };
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (search)
      filters.push({ id: "search", label: `"${search}"`, onRemove: () => setSearch("") });
    if (tagFilter)
      filters.push({ id: "tag", label: `Tag: ${tagFilter}`, onRemove: () => setTagFilter(undefined) });
    if (featuredParam)
      filters.push({ id: "featured", label: "Featured", onRemove: () => (window.location.href = "/products") });
    if (selectedBrand)
      filters.push({ id: "brand", label: `Brand: ${selectedBrand}`, onRemove: () => setSelectedBrand(undefined) });
    selectedCategories.forEach((catId) => {
      const catName = orderedCategories.find((c) => c.id === catId)?.name;
      if (catName)
        filters.push({
          id: `cat-${catId}`,
          label: catName,
          onRemove: () =>
            setSelectedCategories((prev) => prev.filter((id) => id !== catId)),
        });
    });
    if (debouncedMinPrice || debouncedMaxPrice)
      filters.push({
        id: "price",
        label: `Price: ${formatPrice(debouncedMinPrice || 0)} - ${debouncedMaxPrice ? formatPrice(debouncedMaxPrice) : "∞"}`,
        onRemove: () => { setMinPrice(""); setMaxPrice(""); },
      });
    return filters;
  }, [search, tagFilter, featuredParam, selectedBrand, selectedCategories, orderedCategories, debouncedMinPrice, debouncedMaxPrice]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedBrand(undefined);
    setMinPrice("");
    setMaxPrice("");
    setTagFilter(undefined);
  }, []);

  const pageHeading = useMemo(() => {
    if (featuredParam) return "Featured Deals";
    if (selectedCategories.length === 1)
      return orderedCategories.find((c) => c.id === selectedCategories[0])?.name ?? "Products";
    if (selectedCategories.length > 1) return "Multiple Categories";
    if (search) return `Search: "${search}"`;
    return "All Products";
  }, [featuredParam, selectedCategories, orderedCategories, search]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{pageHeading}</h1>
              <p className="text-sm text-muted-foreground mt-0.5" aria-live="polite">
                {(totalCount ?? sorted.length)} product{(totalCount ?? sorted.length) !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="sr-only">
                Sort products
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen((o) => !o)}
                className="gap-1.5 lg:hidden"
                aria-expanded={filtersOpen}
                aria-controls="sidebar-filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              </Button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div
              className="flex items-center gap-2 mt-3 flex-wrap"
              role="list"
              aria-label="Active filters"
            >
              <span className="text-xs text-muted-foreground">Active:</span>
              {activeFilters.map((f) => (
                <Badge
                  key={f.id}
                  variant="secondary"
                  className="gap-1 text-xs"
                  role="listitem"
                >
                  {f.label}
                  <button
                    onClick={f.onRemove}
                    aria-label={`Remove ${f.label} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Sidebar filters ── */}
          <aside
            id="sidebar-filters"
            className={`${filtersOpen ? "block" : "hidden"} lg:block w-full lg:w-56 shrink-0 space-y-6`}
            aria-label="Product filters"
          >
            {/* Search */}
            <div>
              <h3 className="font-display font-semibold text-sm mb-3">Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-display font-semibold text-sm mb-3">
                Category
              </h3>
              <div className="space-y-1" role="group" aria-label="Category filter">
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    selectedCategories.length === 0
                      ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold shadow-sm"
                      : "text-muted-foreground font-medium hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                  }`}
                  aria-pressed={selectedCategories.length === 0}
                >
                  All Categories
                </button>
                {rootCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const children = orderedCategories.filter(
                    (c) => c.parentId === cat.id
                  );
                  const isExpanded = expandedCategories.includes(cat.id);
                  const hasSelectedChild = children.some((child) =>
                    selectedCategories.includes(child.id)
                  );
                  return (
                    <div key={cat.id} className="pt-1 group">
                      <div
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold shadow-sm"
                            : hasSelectedChild
                            ? "text-[var(--brand)] font-semibold"
                            : "text-foreground font-medium hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedCategories((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== cat.id)
                              : [...prev, cat.id]
                          );
                          setExpandedCategories((prev) =>
                            prev.includes(cat.id)
                              ? prev.filter((id) => id !== cat.id)
                              : [...prev, cat.id]
                          );
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                      >
                        <div className="flex items-center">
                          <span>{cat.name}</span>
                          {facets.categories[cat.id] !== undefined && (
                            <span className="text-xs text-muted-foreground ml-1.5 opacity-60">
                              ({facets.categories[cat.id]})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                          {children.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCategories((prev) =>
                                  prev.includes(cat.id)
                                    ? prev.filter((id) => id !== cat.id)
                                    : [...prev, cat.id]
                                );
                              }}
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                              aria-expanded={isExpanded}
                              className="p-0.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                      {children.length > 0 && (
                        <div
                          className={`flex flex-col gap-0.5 ml-3 pl-3 border-l-2 border-border/50 transition-all duration-300 overflow-hidden ${
                            isExpanded
                              ? "max-h-[1000px] opacity-100 mt-1 mb-2"
                              : "max-h-0 opacity-0 mt-0 mb-0"
                          }`}
                        >
                          {children.map((child) => {
                            const isChildSelected = selectedCategories.includes(child.id);
                            return (
                              <button
                                key={child.id}
                                onClick={() =>
                                  setSelectedCategories((prev) =>
                                    isChildSelected
                                      ? prev.filter((id) => id !== child.id)
                                      : [...prev, child.id]
                                  )
                                }
                                aria-pressed={isChildSelected}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                                  isChildSelected
                                    ? "bg-[var(--brand)]/10 text-[var(--brand)] font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center">
                                  <span>{child.name}</span>
                                  {facets.categories[child.id] !== undefined && (
                                    <span className="text-xs opacity-60 ml-1.5">
                                      ({facets.categories[child.id]})
                                    </span>
                                  )}
                                </div>
                                {isChildSelected && (
                                  <Check className="w-3.5 h-3.5 text-[var(--brand)]" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="font-display font-semibold text-sm mb-3">
                Price Range
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground text-xs font-medium">
                      {currency}
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    aria-label="Minimum price"
                    className="w-full h-10 pl-8 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all shadow-sm"
                  />
                </div>
                <span className="text-muted-foreground" aria-hidden="true">-</span>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground text-xs font-medium">
                      {currency}
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    aria-label="Maximum price"
                    className="w-full h-10 pl-8 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Brands */}
            <div>
              <h3 className="font-display font-semibold text-sm mb-3">Brand</h3>
              <div className="space-y-1" role="group" aria-label="Brand filter">
                <button
                  onClick={() => setSelectedBrand(undefined)}
                  aria-pressed={!selectedBrand}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    !selectedBrand
                      ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold shadow-sm"
                      : "text-muted-foreground font-medium hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                  }`}
                >
                  <span>All Brands</span>
                  {!selectedBrand && <Check className="w-3.5 h-3.5 text-[var(--brand)]" aria-hidden="true" />}
                </button>
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    aria-pressed={selectedBrand === brand}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      selectedBrand === brand
                        ? "bg-[var(--brand)]/10 text-[var(--brand)] font-semibold shadow-sm"
                        : "text-foreground font-medium hover:bg-[var(--brand)]/5 hover:text-[var(--brand)]"
                    }`}
                  >
                    <div className="flex items-center">
                      <span>{brand}</span>
                      {facets.brands[brand] !== undefined && (
                        <span className="text-xs opacity-60 ml-1.5">
                          ({facets.brands[brand]})
                        </span>
                      )}
                    </div>
                    {selectedBrand === brand && (
                      <Check className="w-3.5 h-3.5 text-[var(--brand)]" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Product grid ── */}
          <div className="flex-1 min-w-0">
            {/* Sub-category grid */}
            {subCategories.length > 0 && !isLoading && !search && (
              <section aria-label="Shop by subcategory" className="mb-8">
                <h3 className="font-display font-semibold text-lg mb-4">
                  Shop by Subcategory
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subCategories.map((subCat) => (
                    <Link
                      key={subCat.id}
                      href={`/products?category=${subCat.slug}`}
                    >
                      <div className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-[var(--brand)]/40 hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <div className="aspect-[16/9] sm:aspect-[2/1] bg-muted overflow-hidden flex items-center justify-center">
                          {subCat.imageUrl ? (
                            <img
                              src={subCat.imageUrl}
                              alt={subCat.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <Package
                              className="w-8 h-8 text-muted-foreground opacity-20"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-center pointer-events-none">
                          <h4 className="font-medium text-sm group-hover:text-[var(--brand)] transition-colors">
                            {subCat.name}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-20 w-full">
                <StoreLoader />
              </div>
            ) : sorted.length > 0 ? (
              <>
                <div
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5"
                  role="list"
                  aria-label="Products"
                >
                  {sorted.map((product) => (
                    <div key={product.id} role="listitem">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
                {/* Infinite scroll trigger */}
                {nextCursor !== null && (
                  <div
                    ref={observerTarget}
                    className="mt-10 flex justify-center py-8 w-full"
                    aria-live="polite"
                    aria-label="Loading more products"
                  >
                    {isFetchingNext && (
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[var(--brand)]/10 rounded-full blur-3xl animate-pulse" />
                  <svg
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground relative z-10"
                    aria-hidden="true"
                  >
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                      className="text-[var(--brand)]/20"
                      fill="currentColor"
                    />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                    <circle
                      cx="12"
                      cy="12"
                      r="6"
                      fill="var(--background)"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="16"
                      y1="16"
                      x2="20"
                      y2="20"
                      strokeWidth="2"
                      className="text-[var(--brand)]"
                    />
                    <path
                      d="M10 10l4 4m0-4l-4 4"
                      strokeWidth="1.5"
                      className="text-muted-foreground"
                    />
                  </svg>
                </div>
                <h3 className="font-display font-semibold text-2xl mb-2">
                  No products found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  We couldn't find anything matching your current filters. Try
                  broadening your search or clearing some filters.
                </p>
                <Button
                  className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[160px]"
                  onClick={clearAllFilters}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}