// utils/homeConstants.ts
import { Lifestyle, Category } from "@/types/home.types";

export const categoryGradients = [
  { gradient: "from-blue-500/10 to-indigo-500/10", iconColor: "text-blue-500" },
  { gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-purple-500" },
  { gradient: "from-emerald-500/10 to-teal-500/10", iconColor: "text-emerald-500" },
];

export const fallbackLifestyles: Lifestyle[] = [
  { title: "Creative & Technical", description: "For designers, developers, and artists.", icon: "Palette", color: "text-purple-500 bg-purple-500/10", link: "/products?tag=creative" },
  { title: "Professional", description: "For business, productivity, and meetings.", icon: "Briefcase", color: "text-blue-500 bg-blue-500/10", link: "/products?tag=professional" },
  { title: "Gaming", description: "For high-performance, immersive gaming.", icon: "Gamepad2", color: "text-red-500 bg-red-500/10", link: "/products?tag=gaming" },
  { title: "School & Hobbies", description: "For students, learning, and personal projects.", icon: "BookOpen", color: "text-green-500 bg-green-500/10", link: "/products?tag=student" },
  { title: "Entertainment", description: "For movies, music, and streaming.", icon: "Film", color: "text-yellow-500 bg-yellow-500/10", link: "/products?tag=entertainment" },
  { title: "Business", description: "For enterprise-level security and management.", icon: "Building", color: "text-gray-500 bg-gray-500/10", link: "/products?tag=business" },
];

export const fallbackFeatures = [
  { icon: "Truck", title: "Free Shipping", desc: "Orders over $500" },
  { icon: "Shield", title: "2-Year Warranty", desc: "On all products" },
  { icon: "RefreshCw", title: "30-Day Returns", desc: "Hassle-free returns" },
  { icon: "Award", title: "Certified Products", desc: "100% authentic hardware" },
];

export const fallbackBrands = ["Samsung", "Dell", "HP", "Lenovo", "Asus", "Apple", "Acer"];

export const API_ENDPOINTS = {
  branches: "/api/branches",
  featuredProducts: "/api/products?featured=true&limit=8",
  latestProducts: "/api/products?limit=8",
  banners: "/api/content/banners",
  promotions: "/api/content/promotions",
  categories: "/api/categories",
  settings: "/api/settings/public?keys=shipping,general,brands",
  announcements: "/api/content/announcements",
  stats: "/api/admin/stats",
} as const;

export const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT;