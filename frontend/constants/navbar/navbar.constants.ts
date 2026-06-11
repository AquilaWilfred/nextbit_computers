import { Monitor, Cpu, Headphones, Package, LucideIcon } from "lucide-react";

export const NAVIGATION_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Products" },
  { href: "/products?featured=true", label: "Deals" },
];

export const SERVICE_ITEMS = [
  { href: "/repairs", label: "Repairs & Parts", icon: "Wrench" },
  { href: "/e-waste", label: "E-Waste & Trade-In", icon: "Recycle" },
  { href: "/listings", label: "Listings", icon: "List" },
  { href: "/insurance", label: "Insurance", icon: "Shield" },
  { href: "/nextbit-wallet", label: "NextBit Wallet", icon: "CreditCard" },
  { href: "/vip", label: "VIP Services", icon: "Crown" },
];

export const CUSTOMER_SUGGESTED_PROMPTS = [
  "Find a gaming laptop",
  "What is your return policy?",
  "Recommend a budget PC",
];

export const DEFAULT_LOGO_SETTINGS = {
  cropMode: "none",
  cropAmount: 0,
  opacity: 1,
  textSpacing: 16,
  textDisplay: "inline",
  textSide: "none",
};

// FIX: Store component references instead of raw JSX tags
export const categoryIcons: Record<string, LucideIcon> = {
  laptops: Monitor,
  desktops: Cpu,
  accessories: Headphones,
  default: Package,
};