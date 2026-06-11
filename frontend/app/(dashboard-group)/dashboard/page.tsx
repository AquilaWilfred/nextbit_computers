"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { getLoginUrl } from "@/lib/const";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

import {
  DashboardSidebar,
  DashboardOverview,
  OrdersList,
  AddressesTab,
  WishlistTab,
  AccountTab,
} from "@/components/dashboard";

import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { useOrderDetail } from "@/hooks/dashboard/useOrderDetail";
import { useOrderActions } from "@/hooks/dashboard/useOrderActions";
import { useAddressActions } from "@/hooks/dashboard/useAddressActions";
import { useWishlist } from "@/hooks/dashboard/useWishlist";
import { useDeliveryTracking } from "@/hooks/dashboard/useDeliveryTracking";
import { useReceipt } from "@/hooks/dashboard/useReceipt";
import { dashboardService } from "@/lib/services/dashboard/dashboard.service";
import { DashboardTab } from "@/types/dashboard/dashboard.types";
import { VALID_TABS } from "@/constants/dashboard/dashboard.constants";
import StoreLoader from "@/components/StoreLoader";

export default function DashboardPage() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab = VALID_TABS.includes(rawTab as DashboardTab) ? (rawTab as DashboardTab) : "overview";
  const rawOrderId = searchParams.get("orderId");
  const orderId = rawOrderId && Number.isInteger(parseInt(rawOrderId, 10)) && parseInt(rawOrderId, 10) > 0
    ? parseInt(rawOrderId, 10)
    : undefined;

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function loadAddresses() {
    setAddressesLoading(true);
    try {
      const data = await dashboardService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setAddressesLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const data = await dashboardService.getPublicSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  // Data fetching
  const { orders, isLoading: ordersLoading, stats } = useDashboardData();
  const { orderDetail, isLoading: orderDetailLoading, refetch: refetchOrderDetail } = useOrderDetail(orderId);
  const { items: wishlistItems, isLoading: wishlistLoading } = useWishlist();

  // Actions
  const { cancelOrder, reorder, isCancelling, isReordering } = useOrderActions(refetchOrderDetail);
  const { createAddress, deleteAddress, isCreating, isDeleting } = useAddressActions(loadAddresses);
  const { generateReceipt } = useReceipt();

  // Delivery tracking
  const driverLocation = useDeliveryTracking(
    orderId ?? 0,
    orderDetail?.order?.status === "shipped" || orderDetail?.order?.status === "out_for_delivery"
  );

  useEffect(() => {
    loadAddresses();
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StoreLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center py-20">
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
    );
  }

  const handleCancelOrder = async (reason: string) => {
    if (!orderDetail) return;
    try {
      await cancelOrder(orderDetail.order.id, reason);
      setShowCancelModal(false);
    } catch {
      // toast already shown in hook, modal stays open
    }
  };

  const handleReorder = async () => {
    if (orderDetail) {
      await reorder(orderDetail.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
    }
  };

  const handlePrintReceipt = () => {
    if (orderDetail) {
      generateReceipt(orderDetail, settings, user?.email);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container py-8 flex-1">
        <div className="grid lg:grid-cols-4 gap-8">
          <DashboardSidebar
            activeTab={activeTab}
            userName={user?.name}
            userEmail={user?.email}
            onLogout={logout}
          />
          <main className="lg:col-span-3">
            {activeTab === "overview" && (
              <DashboardOverview orders={orders} stats={stats} isLoading={ordersLoading} />
            )}

            {activeTab === "orders" && (
              <OrdersList
                orders={orders}
                isLoading={ordersLoading}
                selectedOrderId={orderId}
                orderDetail={orderDetail}
                isDetailLoading={orderDetailLoading}
                settings={settings}
                isCancelling={isCancelling}
                isReordering={isReordering}
                driverLocation={driverLocation}
                onReorder={handleReorder}
                onCancel={handleCancelOrder}
                onPrintReceipt={handlePrintReceipt}
                showCancelModal={showCancelModal}
                onOpenCancelModal={() => setShowCancelModal(true)}
                onCloseCancelModal={() => setShowCancelModal(false)}
              />
            )}

            {activeTab === "addresses" && (
              <AddressesTab
                addresses={addresses}
                isLoading={addressesLoading}
                isCreating={isCreating}
                isDeleting={isDeleting}
                onCreateAddress={createAddress}
                onDeleteAddress={deleteAddress}
              />
            )}

            {activeTab === "wishlist" && (
              <WishlistTab items={wishlistItems} isLoading={wishlistLoading} />
            )}

            {activeTab === "account" && (
              <AccountTab user={user} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}