// ─────────────────────────────────────────────────────────────────────────────
// const.ts  —  client-side store constants and localStorage utilities
//
// All localStorage access is SSR-safe: every function checks for window before
// touching storage, so Next.js server rendering never throws.
// ─────────────────────────────────────────────────────────────────────────────

// ── SSR-safe localStorage helper (local to this module) ───────────────────────

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth URL helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the login URL, optionally carrying the current path as a redirect
 * parameter so the user lands back where they came from after signing in.
 *
 * @param currentPath  - value from usePathname()
 * @param mode         - "login" (default) | "register"
 */
export function getLoginUrl(
  currentPath: string,
  mode: "login" | "register" = "login"
): string {
  const base = "/auth";
  const params = new URLSearchParams();

  if (mode === "register") params.set("mode", "register");

  // Only carry the redirect param when it actually points somewhere useful
  if (currentPath && currentPath !== "/" && !currentPath.startsWith("/auth")) {
    params.set("redirect", currentPath);
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare list  (max 4 products)
// ─────────────────────────────────────────────────────────────────────────────

const COMPARE_KEY = "store_compare_list";

export interface CompareProduct {
  id: string | number;
  name: string;
  price: string | number;
  image?: string;
  slug?: string;
  [key: string]: any; // allow extra fields passed in from product pages
}

export function getCompareList(): CompareProduct[] {
  try {
    const raw = safeStorage()?.getItem(COMPARE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCompareList(list: CompareProduct[]): void {
  safeStorage()?.setItem(COMPARE_KEY, JSON.stringify(list));
}

/**
 * Toggle a product in/out of the compare list.
 *
 * @returns  true  if the product was added
 *           false if it was removed
 *           false if the list is already at the 4-product limit (not added)
 */
export function toggleCompare(product: CompareProduct): boolean {
  let list = getCompareList();
  const exists = list.some((p) => p.id === product.id);

  if (exists) {
    list = list.filter((p) => p.id !== product.id);
    saveCompareList(list);
    window.dispatchEvent(new Event("compareUpdated"));
    return false;
  }

  if (list.length >= 4) return false; // cap reached — caller should show a toast

  list.push(product);
  saveCompareList(list);
  window.dispatchEvent(new Event("compareUpdated"));
  return true;
}

export function clearCompareList(): void {
  safeStorage()?.removeItem(COMPARE_KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("compareUpdated"));
}

export function isInCompareList(productId: string | number): boolean {
  return getCompareList().some((p) => p.id === productId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recently viewed  (last 8 products)
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_KEY    = "store_recent_list";
const RECENT_LIMIT  = 8;

export interface RecentProduct {
  id: string | number;
  name: string;
  price: string | number;
  image?: string;
  slug?: string;
  [key: string]: any;
}

export function getRecentlyViewed(): RecentProduct[] {
  try {
    const raw = safeStorage()?.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Prepend a product to the recently-viewed list.
 * Duplicates are removed so the product always appears at the front.
 * The list is capped at RECENT_LIMIT entries.
 */
export function addRecentlyViewed(product: RecentProduct): void {
  if (!product) return;
  const list = [
    product,
    ...getRecentlyViewed().filter((p) => p.id !== product.id),
  ].slice(0, RECENT_LIMIT);
  safeStorage()?.setItem(RECENT_KEY, JSON.stringify(list));
}

export function clearRecentlyViewed(): void {
  safeStorage()?.removeItem(RECENT_KEY);
}