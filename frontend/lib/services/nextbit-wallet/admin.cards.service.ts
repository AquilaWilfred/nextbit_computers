// lib/services/nextbit-wallet/admin.cards.service.ts

import { API_BASE, QUERY_STALE_TIME } from "@/constants/nextbit-wallet/admin.cards.constants";
import {
  AdminStats,
  CardRecord,
  Application,
  CardHolder,
  Transaction,
} from "@/types/nextbit-wallet/admin.cards.types";

class AdminCardsService {
  private static instance: AdminCardsService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): AdminCardsService {
    if (!AdminCardsService.instance) {
      AdminCardsService.instance = new AdminCardsService();
    }
    return AdminCardsService.instance;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < QUERY_STALE_TIME;
  }

  private getCached<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)?.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private async fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const text = await response.text();
      let error = {};
      try {
        if (text) {
          error = JSON.parse(text);
        }
      } catch {
        // non-JSON body
      }
      throw new Error((error as any).message || `API error ${response.status}`);
    }

    // Parse response as text first, then JSON to handle empty bodies gracefully
    const text = await response.text();
    if (!text) {
      return null as unknown as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Invalid JSON response: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async getStats(): Promise<AdminStats> {
    const cached = this.getCached<AdminStats>("stats");
    if (cached) return cached;

    const stats = await this.fetchApi<AdminStats>(`${API_BASE}/stats`);
    this.setCache("stats", stats);
    return stats;
  }

  async getCards(): Promise<CardRecord[]> {
    const cached = this.getCached<CardRecord[]>("cards");
    if (cached) return cached;

    const cards = await this.fetchApi<CardRecord[]>(API_BASE);
    this.setCache("cards", cards);
    return cards;
  }

  async getApplications(): Promise<Application[]> {
    const cached = this.getCached<Application[]>("applications");
    if (cached) return cached;

    const apps = await this.fetchApi<Application[]>(`${API_BASE}/applications`);
    this.setCache("applications", apps);
    return apps;
  }

  async getHolders(): Promise<CardHolder[]> {
    const cached = this.getCached<CardHolder[]>("holders");
    if (cached) return cached;

    const holders = await this.fetchApi<CardHolder[]>(`${API_BASE}/holders`);
    this.setCache("holders", holders);
    return holders;
  }

  async getTransactions(): Promise<Transaction[]> {
    const cached = this.getCached<Transaction[]>("transactions");
    if (cached) return cached;

    const transactions = await this.fetchApi<Transaction[]>(`${API_BASE}/transactions`);
    this.setCache("transactions", transactions);
    return transactions;
  }

  async updateCardStatus(cardId: string, status: string): Promise<void> {
    await this.fetchApi(`${API_BASE}/${cardId}/status?status=${status}`, { method: "PATCH" });
    this.clearCache();
  }

  async reviewApplication(appId: string, action: "approved" | "rejected"): Promise<void> {
    await this.fetchApi(`${API_BASE}/applications/${appId}/review`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    this.clearCache();
  }

  async updateKycStatus(holderId: string, status: string): Promise<void> {
    await this.fetchApi(`${API_BASE}/holders/${holderId}/kyc`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    this.clearCache();
  }

  async clearTransactionFlag(txId: string): Promise<void> {
    await this.fetchApi(`${API_BASE}/transactions/${txId}/clear-flag`, { method: "POST" });
    this.clearCache();
  }

  async refreshAllData(): Promise<{
    stats: AdminStats;
    cards: CardRecord[];
    applications: Application[];
    holders: CardHolder[];
    transactions: Transaction[];
  }> {
    const [stats, cards, applications, holders, transactions] = await Promise.all([
      this.getStats(),
      this.getCards(),
      this.getApplications(),
      this.getHolders(),
      this.getTransactions(),
    ]);
    return { stats, cards, applications, holders, transactions };
  }
}

export const adminCardsService = AdminCardsService.getInstance();