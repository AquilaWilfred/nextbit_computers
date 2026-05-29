// constants/settings.constants.ts
import { StoreFeature } from "@/types/settings.types";

export const DEFAULT_FEATURES: StoreFeature[] = [
  {
    icon: "Truck",
    title: "Free Shipping",
    desc: "On orders over $500",
    content:
      "We offer fast, free standard shipping on all orders over $500. Your items will be securely packaged and delivered right to your doorstep within 3-5 business days.",
  },
  {
    icon: "Shield",
    title: "2-Year Warranty",
    desc: "On all products",
    content:
      "Every product we sell is backed by a comprehensive 2-year warranty that covers manufacturer defects and hardware failures.",
  },
  {
    icon: "RefreshCw",
    title: "30-Day Returns",
    desc: "Hassle-free returns",
    content:
      "We offer a hassle-free 30-day return policy. Simply return the item in its original condition and packaging for a full refund or exchange.",
  },
  {
    icon: "Award",
    title: "Certified Products",
    desc: "100% authentic hardware",
    content:
      "We guarantee that all our products are 100% authentic, brand new, and sourced directly from official manufacturers.",
  },
];

export const CACHE_KEY = "settings_cache_general";