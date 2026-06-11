import { PlaceOrderRequest, PlaceOrderResponse } from "@/types/checkout/checkout.types";

export class CheckoutService {
  static async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    const res = await fetch("/api/checkout/place-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || "Unknown error" };
    }

    if (!res.ok) {
      throw new Error(data.detail || data.message || "Failed to place order");
    }

    return {
      orderId: data.orderId ?? data.id,
      orderNumber: data.orderNumber ?? data.order_number ?? String(data.id),
      escrowId: data.escrowId ?? data.escrow_id,
      sellerOpenId: Object.prototype.hasOwnProperty.call(data, "seller_openid")
        ? data.seller_openid
        : undefined,
      sellerId: data.seller_id ?? data.sellerId ?? (data.seller_openid ?? undefined),
    };
  }

  static async initiateMpesa(
    orderId: number,
    amount: number,
    phone: string,
    sellerId?: string | null
  ) {
    const body: any = {
      orderId: orderId.toString(),
      amount: amount.toString(),
      currency: "KES",
      buyerPhone: phone,
      sellerId: sellerId ?? null,
    };

    const res = await fetch("/api/checkout/mpesa/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Failed to initiate M-Pesa payment");
    }

    return res.json();
  }

  static async verifyMpesa(escrowId: string) {
    const res = await fetch(`/api/checkout/mpesa/verify?escrowId=${encodeURIComponent(escrowId)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return res.json();
  }

  static async initiatePaypal(orderId: number) {
    const res = await fetch("/api/checkout/paypal/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to initiate PayPal payment");
    }

    return res.json();
  }

  static async confirmPaypal(orderId: number, paypalOrderId: string) {
    const res = await fetch("/api/checkout/paypal/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId, paypalOrderId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to confirm PayPal payment");
    }

    return res.json();
  }

  static async processCardPayment(orderId: number, cardData: any) {
    const res = await fetch("/api/checkout/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        orderId,
        cardNumber: cardData.number.replace(/\s/g, ""),
        expiry: cardData.expiry,
        cvv: cardData.cvv,
        cardholderName: `${cardData.firstName} ${cardData.lastName}`.trim(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Card payment failed");
    }

    return res.json();
  }
}