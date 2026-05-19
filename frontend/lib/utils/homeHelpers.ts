// utils/homeHelpers.ts
import { Branch } from "@/types/home.types";
import { fallbackLifestyles } from "../../constants/homeConstants";

export const formatPrice = (price: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / 100);

export function parseTimeString(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/\./g, "");
  if (normalized.includes("24/7") || normalized.includes("open 24") || normalized.includes("all day")) {
    return Number.MIN_SAFE_INTEGER;
  }
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3];
  if (period) {
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  }
  return hour * 60 + minute;
}

export function getBranchStatusToday(branch: Branch): "open" | "closed" {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = weekdays[new Date().getDay()];
  const schedule = branch.hours?.find((h) => h.label?.toLowerCase() === today.toLowerCase());
  const value = schedule?.value?.trim() ?? "";
  const normalized = value.toLowerCase();
  
  if (!normalized || normalized.includes("closed") || normalized.includes("holiday") || normalized.includes("no service")) {
    return "closed";
  }
  if (normalized.includes("24") || normalized.includes("open 24") || normalized.includes("all day")) {
    return "open";
  }
  
  const parts = normalized.split(/\s*(?:-|to|–|—)\s*/);
  const start = parseTimeString(parts[0] ?? "");
  const end = parseTimeString(parts[1] ?? "");
  if (start === null || end === null) return "open";
  
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  if (start <= end) return nowMinutes >= start && nowMinutes <= end ? "open" : "closed";
  return nowMinutes >= start || nowMinutes <= end ? "open" : "closed";
}

export function extractSettings(settings: any) {
  const gen = settings?.general as Record<string, unknown> | undefined;
  const heroDescription = (gen?.heroDescription as string) || "Discover the latest laptops, desktops, and accessories from the world's leading brands.";
  return {
    heroTitle: (gen?.heroTitle as string) || "Premium Tech, Exceptional Performance",
    heroDescription: (gen?.heroDescription as string) || "Discover the latest laptops, desktops, and accessories from the world's leading brands.",
    ctaTitle: (gen?.ctaTitle as string) || "Ready to Upgrade Your Setup?",
    ctaDescription: (gen?.ctaDescription as string) || "Join thousands of satisfied customers. Shop the latest tech with confidence — free shipping on orders over $500.",
    storeName: (gen?.storeName as string) || "Store",
    storeDesc: (gen?.storeDescription as string) || heroDescription,
    heroBadge: (gen?.heroBadge as string) || "New Arrivals 2025",
    lifestyles: (gen?.lifestyles as any[]) || fallbackLifestyles,
    address: (gen?.address as string) || "Nairobi, Kenya",
  };
}

export function getDistanceSquared(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2;
}