// lib/services/settings.service.ts
import { PublicSettings } from "@/types/settings.types";
import { CACHE_KEY } from "@/constants/settings.constants";

export class SettingsService {
  private static instance: SettingsService;
  
  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  getCachedSettings(): PublicSettings | null {
    if (typeof sessionStorage === "undefined") return null;
    
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as PublicSettings;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  cacheSettings(settings: PublicSettings): void {
    if (typeof sessionStorage === "undefined") return;
    
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    } catch {
      // Quota exceeded - ignore
    }
  }

  async fetchPublicSettings(): Promise<PublicSettings> {
    const response = await fetch("/api/settings/public?keys=general");
    
    if (!response.ok) {
      throw new Error("Failed to load settings");
    }
    
    return response.json() as Promise<PublicSettings>;
  }
}

export const settingsService = SettingsService.getInstance();