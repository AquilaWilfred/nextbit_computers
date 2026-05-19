// constants/adminNavigation.ts
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  FileText,
  Settings,
  TrendingUp,
  Tag,
  Layers,
  Truck,
  Sparkles,
  Bell,
  GitBranch,
  Network,
  Building2,
  AlertCircle,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", href: "/admin/orders", icon: Package },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { key: "branches", label: "Branches", href: "/admin/branches", icon: GitBranch },
  { key: "network", label: "Fed. Network", href: "/admin/network", icon: Network },
  { key: "products", label: "Products", href: "/admin/products", icon: ShoppingCart },
  { key: "brands", label: "Brands", href: "/admin/brands", icon: Tag },
  { key: "categories", label: "Categories", href: "/admin/categories", icon: Layers },
  { key: "payments", label: "Payments", href: "/admin/payments", icon: CreditCard },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { key: "drivers", label: "Drivers", href: "/admin/drivers", icon: Truck },
  { key: "content", label: "Content", href: "/admin/content", icon: FileText },
  { key: "conflicts", label: "Conflicts", href: "/admin/conflicts", icon: AlertCircle },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
  { key: "ai", label: "AI assistant", href: "/admin/ai", icon: Sparkles },
  { key: "b2b", label: "B2B Portal", href: "/admin/b2b/application", icon: Building2 },
  { key: "notifications", label: "Notifications", href: "/admin/notifications", icon: Bell },
] as const;

export type AdminTabKey = typeof ADMIN_NAV_ITEMS[number]["key"];