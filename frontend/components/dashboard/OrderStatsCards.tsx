import { Package, Truck, CheckCircle, CreditCard } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { DashboardStats } from "@/types/dashboard/dashboard.types";

interface OrderStatsCardsProps {
  stats: DashboardStats;
}

export function OrderStatsCards({ stats }: OrderStatsCardsProps) {
  const cards = [
    { label: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Active Orders", value: stats.pendingOrders, icon: Truck, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30" },
    { label: "Delivered", value: stats.deliveredOrders, icon: CheckCircle, color: "text-green-500 bg-green-50 dark:bg-green-950/30" },
    { label: "Total Spent", value: formatPrice(stats.totalSpent), icon: CreditCard, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`} aria-hidden="true">
            <stat.icon className="w-4.5 h-4.5" />
          </div>
          <p className="font-display font-bold text-xl">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}