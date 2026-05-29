import { TradeInRequest, UserStats, TradeInFormData } from "@/types/listings/listings.types";
import { CACHE_KEY_TRADE_IN, CACHE_KEY_STATS, QUERY_STALE_TIME } from "@/constants/listings/listings.constants";

class TradeInService {
  private static instance: TradeInService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): TradeInService {
    if (!TradeInService.instance) {
      TradeInService.instance = new TradeInService();
    }
    return TradeInService.instance;
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

  async getListings(status?: string): Promise<TradeInRequest[]> {
    const cacheKey = status ? `listings_${status}` : 'listings_all';
    const cached = this.getCached<TradeInRequest[]>(cacheKey);
    if (cached) return cached;

    const url = status && status !== 'all' 
      ? `/api/tradein/listings?status=${status}` 
      : '/api/tradein/listings';
    
    const response = await fetch(url, {
      next: { revalidate: QUERY_STALE_TIME },
      headers: { 'Cache-Control': 'no-store' }
    });
    
    if (!response.ok) throw new Error('Failed to fetch listings');
    const data = await response.json();
    this.setCache(cacheKey, data);
    return data;
  }

  async getStats(): Promise<UserStats> {
    const cached = this.getCached<UserStats>(CACHE_KEY_STATS);
    if (cached) return cached;

    const response = await fetch('/api/tradein/stats', {
      next: { revalidate: QUERY_STALE_TIME }
    });
    
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    this.setCache(CACHE_KEY_STATS, data);
    return data;
  }

  async createListing(formData: FormData): Promise<TradeInRequest> {
    const response = await fetch('/api/tradein/listings', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create listing');
    }
    
    // Invalidate cache after mutation
    this.cache.clear();
    return response.json();
  }

  async updateListing(id: number, data: Partial<TradeInRequest>): Promise<TradeInRequest> {
    const response = await fetch(`/api/tradein/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to update listing');
    
    this.cache.clear();
    return response.json();
  }

  async deleteListing(id: number): Promise<void> {
    const response = await fetch(`/api/tradein/listings/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) throw new Error('Failed to delete listing');
    this.cache.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const tradeInService = TradeInService.getInstance();