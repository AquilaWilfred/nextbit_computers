import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";
import { OverviewSkeleton } from "./OverviewSkeleton";
import { Order, DashboardStats } from "@/types/dashboard/dashboard.types";
import { OrderStatsCards } from "./OrderStatsCards";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface DashboardOverviewProps {
  orders: Order[];
  stats: DashboardStats;
  isLoading: boolean;
}


export function DashboardOverview({ orders, stats, isLoading }: DashboardOverviewProps) {
  if (isLoading) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold">Dashboard Overview</h1>
      <OrderStatsCards stats={stats} />

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Recent Orders</h2>
          <Link href="/dashboard?tab=orders" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {orders.length > 0 ? (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <li key={order.id}>
                <Link href={`/dashboard?tab=orders&orderId=${order.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium font-mono">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-20" aria-hidden="true" />
            <p className="text-sm">No orders yet</p>
            <Link href="/products">
              <Button size="sm" className="mt-3 bg-[var(--brand)] text-white hover:opacity-90">Start Shopping</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}