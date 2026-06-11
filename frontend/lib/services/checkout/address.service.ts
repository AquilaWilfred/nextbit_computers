import { SavedAddress } from "@/types/checkout/checkout.types";

export class AddressService {
  static async fetchAddresses(isAuthenticated: boolean): Promise<SavedAddress[]> {
    if (!isAuthenticated) return [];
    
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
}