"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Package, Truck, MapPin, Calendar, ArrowLeft, Loader2 } from "lucide-react";

interface TrackingStep {
  status: string;
  timestamp: string;
  location?: string;
  description: string;
}

interface OrderDetails {
  orderId: string;
  status: string;
  totalPrice: number;
  estimatedDelivery?: string;
  trackingSteps: TrackingStep[];
  shippingAddress?: {
    name: string;
    address: string;
    phone: string;
  };
}

export default function TrackOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Order not found. Please check your order number.");
          } else {
            setError("Failed to load order details. Please try again later.");
          }
          return;
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError("An error occurred while loading your order. Please try again.");
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[var(--brand)] animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/track-order")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Track Order
          </Button>
          <Card className="p-8 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button
              onClick={() => router.push("/track-order")}
              className="bg-[var(--brand)] text-white hover:opacity-90"
            >
              Try Another Order
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-cyan-100 text-cyan-800",
    in_transit: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/track-order")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Track Order
        </Button>

        <Card className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Order #{order.orderId}</h1>
              <p className="text-muted-foreground mt-2">Order tracking information</p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                statusColors[order.status.toLowerCase()] || "bg-gray-100 text-gray-800"
              }`}
            >
              {order.status}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-border">
            {order.estimatedDelivery && (
              <div className="flex gap-4">
                <Calendar className="w-5 h-5 text-[var(--brand)] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-semibold">{order.estimatedDelivery}</p>
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <Package className="w-5 h-5 text-[var(--brand)] flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="font-semibold">KES {order.totalPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="mb-8 pb-8 border-b border-border">
              <div className="flex gap-4">
                <MapPin className="w-5 h-5 text-[var(--brand)] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Shipping Address</p>
                  <div className="space-y-1">
                    <p className="font-semibold">{order.shippingAddress.name}</p>
                    <p className="text-sm">{order.shippingAddress.address}</p>
                    <p className="text-sm">{order.shippingAddress.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {order.trackingSteps && order.trackingSteps.length > 0 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-8">Delivery Timeline</h2>
            <div className="space-y-6">
              {order.trackingSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    {index < order.trackingSteps.length - 1 && (
                      <div className="w-1 h-12 bg-border my-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold">{step.status}</p>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    {step.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                        <Truck className="w-4 h-4" />
                        {step.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{step.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
