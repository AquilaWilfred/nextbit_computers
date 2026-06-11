import { PublicSettings } from "@/types/checkout/checkout.types";

export class SettingsService {
  static async fetchPublicSettings(): Promise<PublicSettings> {
    try {
      const res = await fetch(
        "/api/settings/public?keys=payment_methods,shipping,general"
      );
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }
}