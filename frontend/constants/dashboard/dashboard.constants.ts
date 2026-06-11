import { DashboardTab } from "@/types/dashboard/dashboard.types";
import { ShoppingBag, Package, MapPin, Heart, User } from "lucide-react";

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:            { label: "Pending",           color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  payment_confirmed:  { label: "Payment Confirmed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  processing:         { label: "Processing",        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  shipped:            { label: "Shipped",           color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  out_for_delivery:   { label: "Out for Delivery",  color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  delivered:          { label: "Delivered",         color: "bg-green-500/10 text-green-600 border-green-500/20" },
  cancelled:          { label: "Cancelled",         color: "bg-red-500/10 text-red-600 border-red-500/20" },
  refunded:           { label: "Refunded",          color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};

export const TRACKING_STAGES = [
  "pending", "payment_confirmed", "processing",
  "shipped", "out_for_delivery", "delivered",
];

export const DASHBOARD_NAV_ITEMS: { id: DashboardTab; label: string; icon: React.ElementType; href: string }[] = [
  { id: "overview",  label: "Overview",  icon: ShoppingBag, href: "/dashboard?tab=overview" },
  { id: "orders",    label: "My Orders", icon: Package,     href: "/dashboard?tab=orders" },
  { id: "addresses", label: "Addresses", icon: MapPin,      href: "/dashboard?tab=addresses" },
  { id: "wishlist",  label: "Wishlist",  icon: Heart,       href: "/dashboard?tab=wishlist" },
  { id: "account",   label: "Account",   icon: User,        href: "/dashboard?tab=account" },
];

export const VALID_TABS: DashboardTab[] = ["overview", "orders", "addresses", "wishlist", "account"];