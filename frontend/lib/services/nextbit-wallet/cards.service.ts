// 03-services/cards.service.ts

import { API_BASE, CACHE_KEYS, QUERY_STALE_TIME } from "@/constants/nextbit-wallet/cards.constants";
import {
  CardProduct,
  CardApplication,
  VirtualCard,
  Transaction,
  UserStats,
  ApplicationFormData,
  ApiResponse,
} from "@/types/nextbit-wallet/cards.types";

// ─── Typed error with HTTP status attached ────────────────────────────────────
class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Cache entry shape ────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  /** AbortController for any in-flight request storing into this key */
  inflight?: AbortController;
}

// ─── Dedup map: prevent simultaneous identical fetches ───────────────────────
type InflightMap = Map<string, Promise<any>>;

class CardsService {
  private static instance: CardsService;
  private cache = new Map<string, CacheEntry<any>>();
  private inflight: InflightMap = new Map();

  static getInstance(): CardsService {
    if (!CardsService.instance) {
      CardsService.instance = new CardsService();
    }
    return CardsService.instance;
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < QUERY_STALE_TIME;
  }

  /** Returns cached value; `undefined` means cache miss; `null` means "no data" cached intentionally */
  private getCached<T>(key: string): T | undefined {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)!.data as T;
    }
    return undefined;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateKey(key: string): void {
    this.cache.delete(key);
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  // ─── Request deduplication ──────────────────────────────────────────────────
  // If two callers request the same URL simultaneously, the second waits on the
  // same Promise instead of firing a duplicate network request.

  private dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  // ─── Core fetch ────────────────────────────────────────────────────────────

  private async fetchApi<T>(
    url: string,
    options?: RequestInit & { signal?: AbortSignal }
  ): Promise<T> {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = body?.detail ?? body?.message ?? message;
      } catch {
        // non-JSON body — keep default message
      }
      throw new ApiError(message, response.status, url);
    }

    return response.json() as Promise<T>;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async getProducts(): Promise<CardProduct[]> {
    const cached = this.getCached<CardProduct[]>(CACHE_KEYS.PRODUCTS);
    if (cached !== undefined) return cached;

    return this.dedup(CACHE_KEYS.PRODUCTS, async () => {
      const products = await this.fetchApi<any[]>(`${API_BASE}/products`);
      const mapped: CardProduct[] = products.map((p) => ({
        id: p.product_type,
        name: p.name,
        type: p.product_type,
        features: p.features ?? [],
        benefits: p.benefits ?? [],
        fees: {
          annual: p.annual_fee,
          foreignTxn: p.foreign_txn_fee,
          atm: p.atm_fee,
        },
        requirements: p.requirements ?? [],
        popular: p.popular,
        colorScheme: {
          bg: p.color_bg ?? "from-blue-600 to-purple-600",
          gradient: "bg-gradient-to-r",
          cardBg: "bg-gradient-to-br from-blue-600 to-purple-800",
          accent: "bg-blue-600",
        },
      }));

      this.setCache(CACHE_KEYS.PRODUCTS, mapped);
      return mapped;
    });
  }

  async getApplications(): Promise<CardApplication[]> {
    const cached = this.getCached<CardApplication[]>(CACHE_KEYS.APPLICATIONS);
    if (cached !== undefined) return cached;

    return this.dedup(CACHE_KEYS.APPLICATIONS, async () => {
      const apps = await this.fetchApi<any[]>(`${API_BASE}/applications`);
      const mapped: CardApplication[] = apps.map((a) => ({
        id: String(a.id),
        cardType: this.getCardTypeName(a.card_type),
        status: a.status,
        appliedAt: a.applied_at,
        approvedAt: a.reviewed_at,
        cardNumber: a.card_number,
        expiryDate: a.expiry_date,
        cvv: a.cvv,
      }));

      this.setCache(CACHE_KEYS.APPLICATIONS, mapped);
      return mapped;
    });
  }

  /**
   * Returns the active virtual card or `null` if the user has none.
   *
   * FIX: Previously the 404 catch compared against the error *message* string,
   * which broke whenever the backend returned a JSON body with its own `message`
   * field (e.g. "No virtual card found") — that string never contained "404",
   * so the error was re-thrown and silently swallowed by the hook, leaving
   * `virtualCard` as `null` even when a card existed in the DB.
   *
   * We now attach the HTTP status code directly to ApiError and branch on that.
   */
  async getVirtualCard(): Promise<VirtualCard | null> {
    const cached = this.getCached<VirtualCard | null>(CACHE_KEYS.VIRTUAL_CARD);
    // `undefined`  → cache miss, must fetch
    // `null`       → intentionally cached "no card"
    // `VirtualCard`→ valid cached card
    if (cached !== undefined) return cached;

    return this.dedup(CACHE_KEYS.VIRTUAL_CARD, async () => {
      try {
        const card = await this.fetchApi<any>(`${API_BASE}/virtual`);

        const virtualCard: VirtualCard = {
          id: String(card.id),
          cardNumber: card.card_number,
          expiryMonth: card.expiry_month,
          expiryYear: card.expiry_year,
          cvv: card.cvv,
          balance: card.balance ?? 0,
          currency: card.currency ?? "KES",
          status: card.status,
          lastFour: card.last_four,
          cardType: card.card_type,
        };

        this.setCache(CACHE_KEYS.VIRTUAL_CARD, virtualCard);
        return virtualCard;
      } catch (err) {
        // ✅ Branch on numeric status code — immune to backend message wording
        if (err instanceof ApiError && err.status === 404) {
          this.setCache(CACHE_KEYS.VIRTUAL_CARD, null);
          return null;
        }
        throw err; // re-throw anything else (500, network error, etc.)
      }
    });
  }

  async getTransactions(limit = 5): Promise<Transaction[]> {
    const key = `${CACHE_KEYS.TRANSACTIONS}:${limit}`;
    const cached = this.getCached<Transaction[]>(key);
    if (cached !== undefined) return cached;

    return this.dedup(key, async () => {
      const transactions = await this.fetchApi<any[]>(
        `${API_BASE}/transactions?limit=${limit}`
      );
      const mapped: Transaction[] = transactions.map((t) => ({
        id: String(t.id),
        merchant: t.merchant,
        amount: t.amount,
        date: new Date(t.created_at).toLocaleDateString(),
        status: t.status,
        description: t.description,
      }));

      this.setCache(key, mapped);
      return mapped;
    });
  }

  async getUserStats(): Promise<UserStats> {
    const cached = this.getCached<UserStats>(CACHE_KEYS.STATS);
    if (cached !== undefined) return cached;

    return this.dedup(CACHE_KEYS.STATS, async () => {
      const stats = await this.fetchApi<any>(`${API_BASE}/stats`);
      const userStats: UserStats = {
        rewardsEarned: stats.rewards_earned ?? 0,
        securityLevel: stats.security_level ?? "3D Secure",
        totalSpent: stats.total_spent ?? 0,
        cardsIssued: stats.cards_issued ?? 0,
      };

      this.setCache(CACHE_KEYS.STATS, userStats);
      return userStats;
    });
  }

  async applyForCard(data: ApplicationFormData): Promise<ApiResponse> {
    const response = await this.fetchApi<ApiResponse>(`${API_BASE}/apply`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Invalidate all caches after a mutation — a new card may now exist
    this.clearCache();
    return response;
  }

  async toggleCardFreeze(freeze: boolean): Promise<ApiResponse> {
    const response = await this.fetchApi<ApiResponse>(
      `${API_BASE}/virtual/toggle-freeze`,
      {
        method: "POST",
        body: JSON.stringify({ freeze }),
      }
    );

    // Only invalidate the virtual card entry — other data is unaffected
    this.invalidateKey(CACHE_KEYS.VIRTUAL_CARD);
    return response;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getCardTypeName(cardType: string): string {
    const names: Record<string, string> = {
      e_nextbit: "E-NextBit Card",
      visa_cyber: "NextBit Visa Cyber",
      visa_black: "NextBit Visa Black",
    };
    return names[cardType] ?? cardType;
  }
}

export const cardsService = CardsService.getInstance();