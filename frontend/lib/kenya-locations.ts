// ─────────────────────────────────────────────────────────────────────────────
// api-client.ts
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const AUTH_TOKEN_KEY = "nextbit_auth_token";

// ── SSR-safe localStorage helper ──────────────────────────────────────────────
// Always use this instead of accessing localStorage directly so that
// server-side rendering never throws "localStorage is not defined".

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getStoredAuthToken(): string | null {
  return safeLocalStorage()?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function setAuthToken(token: string): void {
  safeLocalStorage()?.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  safeLocalStorage()?.removeItem(AUTH_TOKEN_KEY);
}

// ── ApiClient ─────────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const authToken = getStoredAuthToken();
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "include",
    };

    if (body !== undefined && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("HTTP 401: Unauthorized");
        }
        const text = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          // Try to parse structured error from gateway/FastAPI
          const json = JSON.parse(text);
          errorMessage = json?.detail ?? json?.message ?? errorMessage;
        } catch {
          if (text) errorMessage += ` - ${text}`;
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) return undefined as unknown as T;

      return response.json() as Promise<T>;
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("HTTP 401"))) {
        console.error(`API ${method} ${path} failed:`, error);
      }
      throw error;
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export const apiClient = new ApiClient(API_BASE);

// ─────────────────────────────────────────────────────────────────────────────
// Guest Cart
// ─────────────────────────────────────────────────────────────────────────────

export const GUEST_CART_KEY = "nexus_guest_cart";

export interface GuestCartItem {
  productId: number;
  quantity: number;
  // Snapshot data for instant UI rendering (avoids an extra network round-trip)
  name?: string;
  price?: string;
  image?: string;
  slug?: string;
  stock?: number;
}

export function getGuestCart(): GuestCartItem[] {
  try {
    const raw = safeLocalStorage()?.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuestCart(items: GuestCartItem[]): void {
  safeLocalStorage()?.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart(): void {
  safeLocalStorage()?.removeItem(GUEST_CART_KEY);
}

export function addToGuestCart(product: any, quantity = 1): void {
  const cart = getGuestCart();
  const existing = cart.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity = Math.min(product.stock, existing.quantity + quantity);
  } else {
    cart.push({
      productId: product.id,
      quantity,
      name:  product.name,
      price: product.price,
      image: (product.images as string[])?.[0],
      slug:  product.slug,
      stock: product.stock,
    });
  }
  setGuestCart(cart);
}

export function updateGuestCartItem(productId: number, quantity: number): void {
  const cart = getGuestCart();
  if (quantity <= 0) {
    setGuestCart(cart.filter((i) => i.productId !== productId));
  } else {
    const item = cart.find((i) => i.productId === productId);
    if (item) item.quantity = quantity;
    setGuestCart(cart);
  }
}

export function removeFromGuestCart(productId: number): void {
  setGuestCart(getGuestCart().filter((i) => i.productId !== productId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Price formatting
// ─────────────────────────────────────────────────────────────────────────────

export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "Ksh 0.00";

  const store    = safeLocalStorage();
  let currency   = store?.getItem("nexus_currency") ?? "KES";
  let rates: Record<string, number> | null = null;

  try {
    const ratesStr = store?.getItem("nexus_exchange_rates");
    if (ratesStr) rates = JSON.parse(ratesStr);
  } catch {
    // ignore parse errors
  }

  let finalPrice = num;
  if (rates && currency !== "KES" && rates[currency]) {
    finalPrice = num * rates[currency];
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(finalPrice);
}

// ─────────────────────────────────────────────────────────────────────────────
// Order status helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending:           "Pending",
    payment_confirmed: "Payment Confirmed",
    processing:        "Processing",
    shipped:           "Shipped",
    out_for_delivery:  "Out for Delivery",
    delivered:         "Delivered",
    cancelled:         "Cancelled",
    refunded:          "Refunded",
  };
  return labels[status] ?? status;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending:           "text-yellow-600 bg-yellow-50 border-yellow-200",
    payment_confirmed: "text-blue-600 bg-blue-50 border-blue-200",
    processing:        "text-purple-600 bg-purple-50 border-purple-200",
    shipped:           "text-indigo-600 bg-indigo-50 border-indigo-200",
    out_for_delivery:  "text-orange-600 bg-orange-50 border-orange-200",
    delivered:         "text-green-600 bg-green-50 border-green-200",
    cancelled:         "text-red-600 bg-red-50 border-red-200",
    refunded:          "text-gray-600 bg-gray-50 border-gray-200",
  };
  return colors[status] ?? "text-gray-600 bg-gray-50 border-gray-200";
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic country / region system
//
// Design goals:
//   1. Default country is Kenya (KE) — used everywhere unless overridden.
//   2. Regions are fetched from the backend when available so the list stays
//      up-to-date without code changes (supports EA expansion and beyond).
//   3. A built-in Kenya fallback is included so the app works offline / before
//      the backend is ready. No other countries are hardcoded — they come from
//      the API.
//   4. The selected country is persisted in localStorage under "nexus_country"
//      so it survives page refreshes.
//
// Backend contract expected:
//   GET /regions?country=KE
//   Response: { country: "KE", regions: { "Nairobi": ["Nairobi CBD", ...], ... } }
//
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COUNTRY_CODE = "KE";

// ISO 3166-1 alpha-2 → display name for the country selector UI.
// Add more as the platform expands — this list only drives the dropdown.
export const SUPPORTED_COUNTRIES: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  ET: "Ethiopia",
  NG: "Nigeria",
  GH: "Ghana",
  ZA: "South Africa",
  // Extend as needed — regions for these come from the backend, not hardcoded.
};

// Kenya regions are embedded as a reliable offline fallback.
// They are only used when the backend returns nothing for KE.
export const KENYA_COUNTIES_FALLBACK: Record<string, string[]> = {
  Baringo:           ["Kabarnet", "Eldama Ravine", "Marigat"],
  Bomet:             ["Bomet", "Sotik"],
  Bungoma:           ["Bungoma", "Webuye", "Kimilili"],
  Busia:             ["Busia", "Malaba"],
  "Elgeyo-Marakwet": ["Iten", "Tambach"],
  Embu:              ["Embu", "Runyenjes"],
  Garissa:           ["Garissa", "Dadaab"],
  "Homa Bay":        ["Homa Bay", "Mbita"],
  Isiolo:            ["Isiolo", "Merti"],
  Kajiado:           ["Kajiado", "Ongata Rongai", "Kitengela", "Ngong"],
  Kakamega:          ["Kakamega", "Mumias", "Lurambi"],
  Kericho:           ["Kericho", "Litein"],
  Kiambu:            ["Kiambu", "Thika", "Ruiru", "Kikuyu", "Juja"],
  Kilifi:            ["Kilifi", "Malindi", "Mtwapa"],
  Kirinyaga:         ["Kerugoya", "Kutus", "Sagana"],
  Kisii:             ["Kisii", "Ogembo"],
  Kisumu:            ["Kisumu", "Ahero", "Maseno"],
  Kitui:             ["Kitui", "Mwingi"],
  Kwale:             ["Kwale", "Diani Beach", "Ukunda"],
  Laikipia:          ["Nanyuki", "Nyahururu", "Rumuruti"],
  Lamu:              ["Lamu", "Mpeketoni"],
  Machakos:          ["Machakos", "Athi River"],
  Makueni:           ["Wote", "Makindu"],
  Mandera:           ["Mandera", "El Wak"],
  Marsabit:          ["Marsabit", "Moyale"],
  Meru:              ["Meru", "Maua"],
  Migori:            ["Migori", "Isebania"],
  Mombasa:           ["Mombasa Island", "Nyali", "Kisauni", "Likoni", "Changamwe"],
  "Murang'a":        ["Murang'a", "Kenol"],
  Nairobi:           ["Nairobi CBD", "Westlands", "Kasarani", "Embakasi", "Lang'ata", "Dagoretti", "Kibra"],
  Nakuru:            ["Nakuru", "Naivasha", "Gilgil", "Molo"],
  Nandi:             ["Kapsabet", "Nandi Hills"],
  Narok:             ["Narok", "Kilgoris"],
  Nyamira:           ["Nyamira", "Keroka"],
  Nyandarua:         ["Ol Kalou", "Njabini"],
  Nyeri:             ["Nyeri", "Karatina", "Othaya"],
  Samburu:           ["Maralal", "Baragoi"],
  Siaya:             ["Siaya", "Bondo"],
  "Taita-Taveta":    ["Voi", "Wundanyi", "Taveta"],
  "Tana River":      ["Hola", "Garsen"],
  "Tharaka-Nithi":   ["Chuka", "Marimanti"],
  "Trans Nzoia":     ["Kitale", "Kimini"],
  Turkana:           ["Lodwar", "Kakuma"],
  "Uasin Gishu":     ["Eldoret", "Burnt Forest"],
  Vihiga:            ["Vihiga", "Luanda"],
  Wajir:             ["Wajir", "Habaswein"],
  "West Pokot":      ["Kapenguria", "Makutano"],
};

/** Read the user's stored country preference (SSR-safe). */
export function getSelectedCountry(): string {
  return safeLocalStorage()?.getItem("nexus_country") ?? DEFAULT_COUNTRY_CODE;
}

/** Persist the user's country choice. */
export function setSelectedCountry(code: string): void {
  safeLocalStorage()?.setItem("nexus_country", code);
}

/**
 * Fetch regions for a given country code from the backend.
 * Falls back to the embedded Kenya data if the request fails or returns empty.
 *
 * Usage (in a component or server action):
 *   const regions = await fetchRegions("KE");
 */
export async function fetchRegions(
  countryCode: string = DEFAULT_COUNTRY_CODE
): Promise<Record<string, string[]>> {
  try {
    const data = await apiClient.get<{ regions: Record<string, string[]> }>(
      `/regions?country=${countryCode}`
    );
    if (data?.regions && Object.keys(data.regions).length > 0) {
      return data.regions;
    }
  } catch {
    // Network failure or endpoint not implemented yet — use fallback silently
  }

  // Only Kenya has a built-in fallback; other countries return empty until
  // the backend is ready.
  return countryCode === DEFAULT_COUNTRY_CODE ? KENYA_COUNTIES_FALLBACK : {};
}

// Keep the old export name so existing imports don't break immediately.
// Mark as deprecated — migrate callers to fetchRegions() over time.
/** @deprecated Use fetchRegions("KE") instead. */
export const KENYA_COUNTIES = KENYA_COUNTIES_FALLBACK;