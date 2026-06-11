"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Package, Search } from "lucide-react";

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      router.push(`/track-order/${orderNumber.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Package className="w-16 h-16 text-[var(--brand)]" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Track Your Order</h1>
          <p className="text-muted-foreground text-lg">
            Enter your order number to get the latest updates on your shipment
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="order-number" className="text-sm font-medium">
                Order Number
              </label>
              <Input
                id="order-number"
                placeholder="e.g., ORD-2024-001234"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              disabled={!orderNumber.trim()}
              className="w-full h-12 bg-[var(--brand)] text-white hover:opacity-90 gap-2"
            >
              <Search className="w-4 h-4" />
              Track Order
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-semibold mb-4">How to Track Your Order</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">1.</span>
                <span>Enter your order number in the field above</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">2.</span>
                <span>You'll see the current status of your order and shipment details</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">3.</span>
                <span>Updates are typically provided within 24 hours of shipment</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">4.</span>
                <span>For more help, contact our support team at support@nextbit.com</span>
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
