// lib/services/listings/admin.listing.service.ts

import { API_BASE, QUERY_STALE_TIME } from "@/constants/listings/admin.listings.constants";
import { AdminListing, AdminStats, GetListingsParams, StatusUpdatePayload } from "@/types/listings/admin.listings.types";

class AdminTradeInService {
  private static instance: AdminTradeInService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): AdminTradeInService {
    if (!AdminTradeInService.instance) {
      AdminTradeInService.instance = new AdminTradeInService();
    }
    return AdminTradeInService.instance;
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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error ${response.status}`);
    }

    return response.json();
  }

  async getStats(): Promise<AdminStats> {
    const cacheKey = "stats";
    const cached = this.getCached<AdminStats>(cacheKey);
    if (cached) return cached;

    const stats = await this.fetchApi<AdminStats>(`${API_BASE}/stats`);
    this.setCache(cacheKey, stats);
    return stats;
  }

  async getListings(params: GetListingsParams): Promise<AdminListing[]> {
    const cacheKey = `listings_${JSON.stringify(params)}`;
    const cached = this.getCached<AdminListing[]>(cacheKey);
    if (cached) return cached;

    const urlParams = new URLSearchParams();
    if (params.status && params.status !== 'all') urlParams.append('status', params.status);
    if (params.device_type && params.device_type !== 'all') urlParams.append('device_type', params.device_type);
    if (params.branch && params.branch !== 'all') urlParams.append('branch', params.branch);
    if (params.search) urlParams.append('search', params.search);
    if (params.sort_by) urlParams.append('sort_by', params.sort_by);
    if (params.limit) urlParams.append('limit', params.limit.toString());
    if (params.offset) urlParams.append('offset', params.offset.toString());

    const listings = await this.fetchApi<AdminListing[]>(`${API_BASE}/listings?${urlParams.toString()}`);
    this.setCache(cacheKey, listings);
    return listings;
  }

  async updateStatus(id: number, payload: StatusUpdatePayload): Promise<void> {
    await this.fetchApi(`${API_BASE}/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    this.clearCache(); // Clear all cache after mutation
  }

  async getBranches(): Promise<string[]> {
    const stats = await this.getStats();
    return stats.branches;
  }
}

export const adminTradeInService = AdminTradeInService.getInstance();