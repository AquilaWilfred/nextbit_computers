"use client";

import { Suspense, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch, useProxyFetch } from "@/lib/api-hooks";
import { formatPrice } from "@/lib/cart";

/* ─── Types ──────────────────────────────────────────────────── */
export interface Order {
  id: string;
  orderNumber?: string;
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total?: number;
  createdAt?: string;
}

/* ─── Static Helpers (defined outside component for stable refs) */
const STATUS_BADGE: Record<
  NonNullable<Order["status"]>,
  "default" | "secondary" | "outline" | "destructive"
> = {
  delivered: "default",
  pending: "secondary",
  processing: "outline",
  shipped: "outline",
  cancelled: "destructive",
};

function getBadgeVariant(status?: Order["status"]) {
  return status ? (STATUS_BADGE[status] ?? "outline") : "outline";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/* ─── Sub-components (memoised to avoid needless re-renders) ─── */
const OrderSkeleton = memo(function OrderSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 4 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
});

const MobileOrderCard = memo(function MobileOrderCard({
  order,
}: {
  order: Order;
}) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            Order #{order.orderNumber ?? order.id}
          </span>
          <Badge variant={getBadgeVariant(order.status)}>
            {order.status ?? "Unknown"}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatPrice(order.total ?? 0)}</span>
          <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
        </div>
      </div>
    </Card>
  );
});

const DesktopOrderRow = memo(function DesktopOrderRow({
  order,
}: {
  order: Order;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {order.orderNumber ?? order.id}
      </TableCell>
      <TableCell>
        <Badge variant={getBadgeVariant(order.status)}>
          {order.status ?? "Unknown"}
        </Badge>
      </TableCell>
      <TableCell>{formatPrice(order.total ?? 0)}</TableCell>
      <TableCell>
        <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
      </TableCell>
    </TableRow>
  );
});

/* ─── Page metadata (App Router) ────────────────────────────── */
// Place this in a separate `metadata.ts` or at the top of a
// `page.tsx` server component that wraps this client component.
//
// export const metadata: Metadata = {
//   title: "My Orders | Dashboard",
//   description: "View and track all your recent orders.",
//   robots: { index: false, follow: false }, // private dashboard page
// };

/* ─── Main Page ──────────────────────────────────────────────── */
export default function DashboardOrdersPage() {
  const {
    data: orders,
    isLoading,
    error,
  } = useProxyFetch<Order[]>("/api/orders/my-orders");

  // Memoize derived values so they only recompute when `orders` changes
  const sortedOrders = useMemo(
    () =>
      orders
        ? [...orders].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
          )
        : [],
    [orders]
  );

  return (
    <AdminLayout activeTab="orders">
      {/* Semantic landmark improves accessibility & crawlability */}
      <main className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
            <p className="text-muted-foreground mt-1">
              Recent orders from your account.
            </p>
          </div>
        </header>

        {/* ── Error state ─────────────────────────────────────── */}
        {error && (
          <Card
            role="alert"
            aria-live="assertive"
            className="p-6 border-destructive"
          >
            <p className="text-destructive font-medium">
              Unable to load orders.
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </Card>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!isLoading && !error && sortedOrders.length === 0 && (
          <Card className="p-6">
            <p className="text-muted-foreground">No orders found.</p>
          </Card>
        )}

        {/* ── Mobile Cards ────────────────────────────────────── */}
        {(isLoading || sortedOrders.length > 0) && (
          <section
            aria-label="Orders list"
            className="block md:hidden space-y-4"
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))
              : sortedOrders.map((order) => (
                  <MobileOrderCard key={order.id} order={order} />
                ))}
          </section>
        )}

        {/* ── Desktop Table ───────────────────────────────────── */}
        {(isLoading || sortedOrders.length > 0) && (
          <Card className="hidden md:block overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Order #</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Total</TableHead>
                  <TableHead scope="col">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Suspense fallback={<OrderSkeleton />}>
                  {isLoading ? (
                    <OrderSkeleton />
                  ) : (
                    sortedOrders.map((order) => (
                      <DesktopOrderRow key={order.id} order={order} />
                    ))
                  )}
                </Suspense>
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </AdminLayout>
  );
}