"use client";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { getLoginUrl } from "@/lib/const";
import {
  CheckCircle,
  ChevronRight,
  CreditCard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Plus,
  Printer,
  ShoppingBag,
  Heart,
  Trash2,
  Truck,
  Phone,
  User,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useSearch } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import StoreLoader from "@/components/StoreLoader";
import { MapView } from "@/components/map/MapView";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentReference?: string;
  total: string;
  subtotal: string;
  shippingCost: string;
  shippingFullName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode?: string;
  shippingCountry: string;
  shippingPhone: string;
  deliveryOtp?: string;
  createdAt: string;
}

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface OrderHistory {
  id: number;
  status: string;
  note?: string;
  createdAt: string;
}

interface OrderDetail {
  order: Order;
  items: OrderItem[];
  history: OrderHistory[];
  payment?: { transactionId?: string };
  agent?: { name?: string; phone?: string; vehicleNumber?: string };
}

interface Address {
  id: number;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}

interface WishlistItem {
  id: number;
  product: Record<string, unknown>;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: unknown;
  stock: number;
}

interface PublicSettings {
  general?: Record<string, unknown>;
  appearance?: { logoUrl?: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatPrice = (value: string | number) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? (n > 1000 ? n / 100 : n) : 0
  );
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:            { label: "Pending",           color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  payment_confirmed:  { label: "Payment Confirmed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  processing:         { label: "Processing",        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  shipped:            { label: "Shipped",           color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  out_for_delivery:   { label: "Out for Delivery",  color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  delivered:          { label: "Delivered",         color: "bg-green-500/10 text-green-600 border-green-500/20" },
  cancelled:          { label: "Cancelled",         color: "bg-red-500/10 text-red-600 border-red-500/20" },
  refunded:           { label: "Refunded",          color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};
const getOrderStatusLabel = (s: string) => ORDER_STATUS_MAP[s]?.label ?? s;
const getOrderStatusColor = (s: string) => ORDER_STATUS_MAP[s]?.color ?? "";

// ─── Auth-aware REST fetcher ──────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',  // HttpOnly cookie sent automatically
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Generic polling hook (replaces trpc.*.useQuery + refetchInterval) ────────
function usePolling<T>(
  url: string,
  { interval = 0, enabled = true }: { interval?: number; enabled?: boolean } = {}
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await apiFetch<T>(url);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
    if (!interval) return;
    const t = setInterval(fetchData, interval);
    return () => clearInterval(t);
  }, [fetchData, interval]);

  const refetch = useCallback(() => { setIsLoading(true); fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch };
}

// ─── Mutation hook (replaces trpc.*.useMutation) ──────────────────────────────
function useMutation<TData, TVariables>(
  fn: (vars: TVariables) => Promise<TData>,
  callbacks?: {
    onSuccess?: (data: TData, vars: TVariables) => void;
    onError?: (err: Error) => void;
  }
) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (vars: TVariables) => {
      setIsPending(true);
      try {
        const data = await fn(vars);
        callbacks?.onSuccess?.(data, vars);
        return data;
      } catch (err) {
        callbacks?.onError?.(err as Error);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn]
  );

  const mutateAsync = mutate;
  return { mutate, mutateAsync, isPending };
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = "overview" | "orders" | "addresses" | "wishlist" | "account";

// ─── Dashboard Shell ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const params = useParams<{ orderId?: string }>();
  const search = useSearch();
  const rawTab = new URLSearchParams(search).get("tab") ?? "overview";
  const VALID_TABS: Tab[] = ["overview", "orders", "addresses", "wishlist", "account"];
  const activeTab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "overview";

  if (loading ) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center"><StoreLoader /></div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center py-20">
          <div>
            <User className="w-16 h-16 mx-auto mb-4 opacity-20" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">Please sign in to access your dashboard.</p>
            <Button
              className="bg-[var(--brand)] text-white hover:opacity-90"
              onClick={() => (window.location.href = getLoginUrl("/dashboard/overview"))}
            >
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const navItems: { id: Tab; label: string; icon: React.ElementType; href: string }[] = [
    { id: "overview",  label: "Overview",  icon: ShoppingBag, href: "/dashboard/overview?tab=overview" },
    { id: "orders",    label: "My Orders", icon: Package,     href: "/dashboard/overview?tab=orders" },
    { id: "addresses", label: "Addresses", icon: MapPin,      href: "/dashboard/overview?tab=addresses" },
    { id: "wishlist",  label: "Wishlist",  icon: Heart,       href: "/dashboard/overview?tab=wishlist" },
    { id: "account",   label: "Account",   icon: User,        href: "/dashboard/overview?tab=account" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-8 flex-1">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1" aria-label="Dashboard navigation">
            <div className="bg-card border border-border rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center" aria-hidden="true">
                  <span className="font-display font-bold text-[var(--brand)]">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user?.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <nav>
                <ul className="space-y-1">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href}>
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            activeTab === item.id
                              ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                          aria-current={activeTab === item.id ? "page" : undefined}
                        >
                          <item.icon className="w-4 h-4" aria-hidden="true" />
                          {item.label}
                        </div>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            {activeTab === "overview" && <DashboardOverview />}
            {activeTab === "orders" && (
              params.orderId
                ? <OrderDetail orderId={parseInt(params.orderId)} />
                : <OrdersList />
            )}
            {activeTab === "addresses" && <AddressesTab />}
            {activeTab === "wishlist"  && <WishlistTab />}
            {activeTab === "account"   && <AccountTab user={user} />}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function DashboardOverview() {
  // Poll every 10 s for live order updates
  const { data: orders, isLoading } = usePolling<Order[]>("/api/orders/my", { interval: 10_000 });

  const stats = {
    total:     orders?.length ?? 0,
    pending:   orders?.filter((o) => ["pending", "processing"].includes(o.status)).length ?? 0,
    delivered: orders?.filter((o) => o.status === "delivered").length ?? 0,
    spent:     orders?.reduce((s, o) => s + parseFloat(o.total), 0) ?? 0,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold">Dashboard Overview</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders",  value: stats.total,               icon: Package,     color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
          { label: "Active Orders", value: stats.pending,             icon: Truck,       color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30" },
          { label: "Delivered",     value: stats.delivered,           icon: CheckCircle, color: "text-green-500 bg-green-50 dark:bg-green-950/30" },
          { label: "Total Spent",   value: formatPrice(stats.spent),  icon: CreditCard,  color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`} aria-hidden="true">
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <p className="font-display font-bold text-xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : orders && orders.length > 0 ? (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <li key={order.id}>
                <Link href={`/dashboard/orders/${order.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                      <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                    </div>
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

// ─── Orders List ──────────────────────────────────────────────────────────────
function OrdersList() {
  const { data: orders, isLoading } = usePolling<Order[]>("/api/orders/my", { interval: 10_000 });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">My Orders</h1>
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : orders && orders.length > 0 ? (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/dashboard/orders/${order.id}`}>
                <div className="bg-card border border-border rounded-xl p-4 hover:border-[var(--brand)]/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{order.paymentMethod ?? "—"} payment</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold">{formatPrice(order.total)}</p>
                      <Badge className={`text-xs mt-1 ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[var(--brand)]">
                    View Details <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="font-medium">No orders yet</p>
          <Link href="/products">
            <Button size="sm" className="mt-4 bg-[var(--brand)] text-white hover:opacity-90">Browse Products</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ orderId }: { orderId: number }) {
  const { user, isAuthenticated } = useAuth();

  // REST: poll every 5 s for order status changes
  const { data, isLoading, refetch: refetchOrder } = usePolling<OrderDetail>(
    `/api/orders/${orderId}`,
    { interval: 5_000 }
  );

  // REST: settings (no polling needed)
  const { data: settings } = usePolling<PublicSettings>(
    "/api/settings/public?keys=appearance,general"
  );

  // ── Live driver location via WebSocket ────────────────────────────────────
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const status = data?.order?.status;
    if (status !== "shipped" && status !== "out_for_delivery") return;

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${window.location.host}/ws/delivery/${orderId}`;

    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const loc = JSON.parse(event.data as string) as { lat?: string; lng?: string; heading?: number };
          if (!loc.lat || !loc.lng) return;

          const position = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
          setDriverLocation(position);

          if (mapRef.current && window.google) {
            mapRef.current.panTo(position);

            if (!markerRef.current) {
              const el = document.createElement("div");
              el.innerHTML = "🚚";
              el.className = "bg-white p-2 rounded-full shadow-lg text-2xl border-2 border-[var(--brand)] flex items-center justify-center transition-all duration-1000 ease-linear";
              markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                map: mapRef.current, position, content: el, title: "Delivery Driver",
              });
            } else {
              markerRef.current.position = position;
              if (loc.heading && markerRef.current.content) {
                (markerRef.current.content as HTMLElement).style.transform = `rotate(${loc.heading}deg)`;
              }
            }
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => { retryTimer = setTimeout(connect, 10_000); };
      ws.onerror  = () => { /* silent — delivery WS is optional */ };
    };

    connect();
    return () => { clearTimeout(retryTimer); ws?.close(); };
  }, [data?.order?.status, orderId]);

  // ── Cancel order ──────────────────────────────────────────────────────────
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const cancelOrder = useMutation(
    (vars: { orderNumber: string; reason: string }) =>
      apiFetch("/api/orders/cancel", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    {
      onSuccess: () => {
        toast.success("Order cancelled successfully.");
        refetchOrder();
        setIsCancelModalOpen(false);
        setCancellationReason("");
      },
      onError: (err) => toast.error(err.message),
    }
  );

  // ── Re-order ──────────────────────────────────────────────────────────────
  const syncCart = useMutation(
    (items: { productId: number; quantity: number }[]) =>
      apiFetch("/api/cart/sync", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    {
      onSuccess: () => {
        toast.success("Items added to your cart!");
        window.location.href = "/cart";
      },
      onError: (err) => toast.error(err.message || "Failed to reorder items."),
    }
  );

  const handleReorder = async () => {
    if (!data) return;
    await syncCart.mutateAsync(
      data.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
  };

  // ── Receipt ───────────────────────────────────────────────────────────────
  const handleGenerateReceipt = () => {
    if (!data) return;
    const { order, items, payment } = data;
    const storeName = (settings?.general?.storeName as string) || "Store";
    const logoUrl   = settings?.appearance?.logoUrl;
    const address   = (settings?.general?.address as string) || "123 Innovation Drive";
    const email     = (settings?.general?.contactEmail as string) || "support@company.com";
    const tagline   = (settings?.general?.heroTitle as string) || "Premium Tech";

    const win = window.open("", "_blank");
    if (!win) return toast.error("Please allow popups to print receipts");

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${storeName}" style="max-height:40px;max-width:150px;margin-bottom:4px;"/>`
      : `<h2 style="margin:0 0 4px 0;font-size:20px;">${storeName}</h2>`;

    win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${order.orderNumber}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body{font-family:'Inter',sans-serif;color:#1f2937;max-width:800px;margin:0 auto;padding:20px;line-height:1.5}
      .wrap{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px 30px}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #f3f4f6;padding-bottom:15px;margin-bottom:20px}
      .title{font-size:24px;font-weight:800;color:#111827;letter-spacing:-.025em;margin:0}
      .num{color:#6b7280;font-size:16px;margin-top:4px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:8px}
      .sec-title{font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;letter-spacing:.05em;margin-bottom:8px}
      .det{font-size:13px;color:#374151}.det strong{color:#111827;font-weight:600}
      table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:20px}
      th{text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
      td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151}
      .tr{text-align:right}
      .totals{width:280px;margin-left:auto;background:#f9fafb;padding:16px;border-radius:8px}
      .trow{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4b5563}
      .trow.bold{font-weight:700;font-size:16px;color:#111827;border-top:2px solid #e5e7eb;padding-top:10px;margin-top:6px}
      .badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase}
      .paid{background:#d1fae5;color:#065f46}.pend{background:#fef3c7;color:#92400e}
    </style></head>
    <body onload="window.print()">
    <div class="wrap">
      <div class="hdr">
        <div><div class="title">RECEIPT</div><div class="num">#${order.orderNumber}</div></div>
        <div class="tr">${logoHtml}<p style="color:#6b7280;font-size:13px;margin:4px 0 0">${address}<br/>${email}</p></div>
      </div>
      <div class="grid">
        <div>
          <div class="sec-title">Billed To</div>
          <div class="det">
            <strong>${order.shippingFullName}</strong><br/>
            ${order.shippingAddress}<br/>
            ${order.shippingCity}${order.shippingPostalCode ? ", " + order.shippingPostalCode : ""}<br/>
            ${order.shippingCountry}<br/>
            ${order.shippingPhone}<br/>
            ${user?.email ?? ""}
          </div>
        </div>
        <div class="tr">
          <div class="sec-title">Order Details</div>
          <div class="det">
            Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong><br/>
            Status: <strong>${order.status.replace(/_/g, " ").toUpperCase()}</strong><br/>
            Method: <strong>${order.paymentMethod?.toUpperCase() ?? "N/A"}</strong><br/>
            ${payment?.transactionId || order.paymentReference
              ? `Txn: <strong style="font-family:monospace;font-size:12px;word-break:break-all">${payment?.transactionId ?? order.paymentReference}</strong><br/>`
              : ""}
            <div style="margin-top:8px"><span class="badge ${order.paymentStatus === "paid" ? "paid" : "pend"}">${order.paymentStatus}</span></div>
          </div>
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th class="tr">Price</th><th class="tr">Qty</th><th class="tr">Total</th></tr></thead>
        <tbody>
          ${items.map((i) => `<tr><td><strong>${i.productName}</strong></td><td class="tr">${formatPrice(i.price)}</td><td class="tr">${i.quantity}</td><td class="tr">${formatPrice(i.subtotal)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="totals">
        <div class="trow"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
        <div class="trow"><span>Shipping</span><span>${formatPrice(order.shippingCost)}</span></div>
        <div class="trow bold"><span>Total</span><span>${formatPrice(order.total)}</span></div>
      </div>
      <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 4px">${tagline}</p>
      </div>
    </div></body></html>`);
    win.document.close();
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><StoreLoader /></div>;
  if (!data) return <div className="text-center py-20 text-muted-foreground">Order not found</div>;

  const { order, items, history, agent } = data;

  const TRACKING_STAGES = [
    "pending", "payment_confirmed", "processing",
    "shipped", "out_for_delivery", "delivered",
  ];
  const currentStageIndex = TRACKING_STAGES.indexOf(order.status);

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link href="/dashboard/orders" className="text-muted-foreground hover:text-foreground">← Orders</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono">{order.orderNumber}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {["pending", "payment_confirmed", "processing"].includes(order.status) && (
            <Button
              variant="destructive" size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              disabled={cancelOrder.isPending}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              {cancelOrder.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          )}
          {["delivered", "cancelled", "refunded"].includes(order.status) && (
            <Button
              variant="default" size="sm"
              onClick={handleReorder}
              disabled={syncCart.isPending}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {syncCart.isPending ? "Adding…" : "Reorder"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleGenerateReceipt} className="gap-2">
            <Printer className="w-4 h-4" aria-hidden="true" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Tracking Timeline */}
      <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="tracking-heading">
        <h2 id="tracking-heading" className="font-display font-semibold mb-5 flex items-center gap-2">
          <Truck className="w-4.5 h-4.5 text-[var(--brand)]" aria-hidden="true" /> Order Tracking
        </h2>
        <div className="relative">
          <ol className="flex justify-between mb-2" aria-label="Order status steps">
            {TRACKING_STAGES.map((stage, i) => (
              <li key={stage} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    i <= currentStageIndex
                      ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                      : "border-border bg-background"
                  }`}
                  aria-current={i === currentStageIndex ? "step" : undefined}
                >
                  {i < currentStageIndex
                    ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    : <span className="text-[10px] font-bold" aria-hidden="true">{i + 1}</span>}
                </div>
                <span className="text-[10px] text-center text-muted-foreground hidden sm:block leading-tight">
                  {getOrderStatusLabel(stage)}
                </span>
              </li>
            ))}
          </ol>
          {/* Progress bar */}
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-border -z-10" aria-hidden="true">
            <div
              className="h-full bg-[var(--brand)] transition-all duration-500"
              style={{ width: `${(Math.max(0, currentStageIndex) / (TRACKING_STAGES.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* History log */}
        <ol className="mt-4 space-y-2" aria-label="Order history">
          {history.map((h, i) => (
            <li key={h.id} className="flex gap-2.5 text-sm">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === history.length - 1 ? "bg-[var(--brand)]" : "bg-green-500"}`}
                aria-hidden="true"
              />
              <div>
                <span className="font-medium">{getOrderStatusLabel(h.status)}</span>
                {h.note && <span className="text-muted-foreground ml-1.5">— {h.note}</span>}
                <time className="text-xs text-muted-foreground ml-1.5" dateTime={h.createdAt}>
                  {new Date(h.createdAt).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Live Delivery Map */}
      {(order.status === "shipped" || order.status === "out_for_delivery") && (
        <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="font-display font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-[var(--brand)]" aria-hidden="true" /> Live Delivery Tracking
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="p-4 bg-muted/40 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Delivery Agent</p>
                <p className="font-medium">{agent?.name ?? "Assigned Driver"}</p>
                <p className="text-sm text-muted-foreground mt-1">Vehicle: {agent?.vehicleNumber ?? "Pending"}</p>
                <Button
                  variant="outline"
                  className="w-full mt-3 gap-2 hover:bg-[var(--brand)] hover:text-white transition-colors"
                  onClick={() => agent?.phone && window.open(`tel:${agent.phone}`)}
                  disabled={!agent?.phone}
                  aria-label={agent?.phone ? `Call agent at ${agent.phone}` : "Agent phone unavailable"}
                >
                  <Phone className="w-4 h-4" aria-hidden="true" /> Call Agent
                </Button>
              </div>
              <div className="p-4 bg-muted/40 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Delivery OTP</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-[var(--brand)]" aria-label={`OTP: ${order.deliveryOtp ?? "not yet assigned"}`}>
                  {order.deliveryOtp ?? "----"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Provide this code to the agent upon arrival.</p>
              </div>
            </div>
            <div className="md:col-span-2 rounded-lg overflow-hidden border border-border h-[280px] bg-muted" aria-label="Delivery map">
              <MapView
                initialZoom={14}
                onMapReady={(map) => {
                  mapRef.current = map;
                  if (driverLocation) map.setCenter(driverLocation);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Order Items */}
      <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="items-heading">
        <h2 id="items-heading" className="font-display font-semibold mb-4">Items</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 items-center">
              {item.productImage && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                    width={48} height={48}
                    loading="lazy" decoding="async"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="border-t border-border mt-4 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{parseFloat(order.shippingCost) === 0 ? "Free" : formatPrice(order.shippingCost)}</dd></div>
          <div className="flex justify-between font-display font-bold text-base pt-1 border-t border-border"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title"
        >
          <Card className="w-full max-w-md shadow-2xl border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cancelOrder.mutate({ orderNumber: order.orderNumber, reason: cancellationReason });
              }}
            >
              <div className="p-6 space-y-4">
                <h3 id="cancel-modal-title" className="text-lg font-bold">Cancel Order</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to cancel this order? This action cannot be undone.</p>
                <div className="space-y-2">
                  <Label htmlFor="cancellationReason">Reason for cancellation (optional)</Label>
                  <Textarea
                    id="cancellationReason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="e.g., Ordered by mistake, found a better price…"
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>Back</Button>
                <Button type="submit" variant="destructive" disabled={cancelOrder.isPending}>
                  {cancelOrder.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Cancelling…</>
                    : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Addresses ────────────────────────────────────────────────────────────────
function AddressesTab() {
  const { data: addresses, isLoading, refetch } = usePolling<Address[]>("/api/addresses");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "", phone: "", addressLine: "", city: "", postalCode: "", country: "", isDefault: false,
  });

  const createAddress = useMutation(
    (vars: typeof form) => apiFetch<Address>("/api/addresses", { method: "POST", body: JSON.stringify(vars) }),
    {
      onSuccess: () => {
        refetch();
        setShowForm(false);
        setForm({ fullName: "", phone: "", addressLine: "", city: "", postalCode: "", country: "", isDefault: false });
        toast.success("Address saved!");
      },
      onError: () => toast.error("Failed to save address"),
    }
  );

  const deleteAddress = useMutation(
    ({ addressId }: { addressId: number }) =>
      apiFetch(`/api/addresses/${addressId}`, { method: "DELETE" }),
    {
      onSuccess: () => { refetch(); toast.success("Address deleted"); },
      onError: () => toast.error("Failed to delete address"),
    }
  );

  const field = (
    key: keyof typeof form,
    label: string,
    colSpan?: boolean
  ) => (
    <div className={`space-y-1${colSpan ? " sm:col-span-2" : ""}`}>
      <Label htmlFor={`addr-${key}`}>{label}</Label>
      <Input
        id={`addr-${key}`}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Saved Addresses</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-[var(--brand)] text-white hover:opacity-90 gap-1.5">
          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add Address
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-display font-semibold text-sm mb-4">New Address</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {field("fullName",    "Full Name")}
            {field("phone",       "Phone")}
            {field("addressLine", "Address", true)}
            {field("city",        "City")}
            {field("postalCode",  "Postal Code")}
            {field("country",     "Country", true)}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => createAddress.mutate(form)}
              disabled={createAddress.isPending}
              className="bg-[var(--brand)] text-white hover:opacity-90"
            >
              {createAddress.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Saving…</> : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : addresses && addresses.length > 0 ? (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" aria-hidden="true" />
                <address className="not-italic">
                  <p className="font-medium text-sm">{addr.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {addr.addressLine}, {addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ""}, {addr.country}
                  </p>
                  <p className="text-xs text-muted-foreground">{addr.phone}</p>
                  {addr.isDefault && (
                    <Badge className="text-xs mt-1 bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20">Default</Badge>
                  )}
                </address>
              </div>
              <button
                onClick={() => deleteAddress.mutate({ addressId: addr.id })}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Delete address for ${addr.fullName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-20" aria-hidden="true" />
          <p className="text-sm">No saved addresses yet</p>
        </div>
      )}
    </div>
  );
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
function WishlistTab() {
  const { data: items, isLoading } = usePolling<WishlistItem[]>("/api/wishlist");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">My Wishlist</h1>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <ProductCard key={item.product.id as number} product={item.product as unknown as Product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="font-medium">Your wishlist is empty</p>
          <Link href="/products">
            <Button size="sm" className="mt-4 bg-[var(--brand)] text-white hover:opacity-90">Browse Products</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────
function AccountTab({ user }: { user: { name?: string; email?: string; role?: string; createdAt?: string; lastSignedIn?: string } | null }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Account Settings</h1>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[var(--brand)]/10 flex items-center justify-center" aria-hidden="true">
            <span className="font-display font-bold text-xl text-[var(--brand)]">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-lg">{user?.name ?? "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge className="text-xs mt-1 capitalize">{user?.role ?? "user"}</Badge>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          {[
            { label: "Name",         value: user?.name },
            { label: "Email",        value: user?.email },
            { label: "Member Since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined },
            { label: "Last Sign In", value: user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : undefined },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}