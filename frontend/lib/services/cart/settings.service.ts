import { PublicSettings } from "@/types/cart/cart.types";

class SettingsService {
  async getPublicSettings(): Promise<PublicSettings> {
    try {
      const res = await fetch("/api/settings/public?keys=shipping,general");
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }
}

export const settingsService = new SettingsService();