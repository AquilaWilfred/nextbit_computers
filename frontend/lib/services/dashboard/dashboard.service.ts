import { Order, OrderDetail, Address, WishlistItem, PublicSettings, DashboardStats } from "@/types/dashboard/dashboard.types";

class DashboardService {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async getOrders(): Promise<Order[]> {
    return this.fetch<Order[]>("/api/orders/my");
  }

  async getOrderDetail(orderId?: number): Promise<OrderDetail> {
    if (typeof orderId !== "number" || !Number.isInteger(orderId) || orderId <= 0) {
      return Promise.reject(new Error("Invalid order id"));
    }

    type FlatOrderDetailResponse = {
      id: number;
      user_id: number;
      total_amount: number | string;
      status: string;
      shipping_address: string;
      created_at: string;
      items: Array<{
        product_id: number | null;
        quantity: number;
        price: number | string;
        product_name: string;
      }>;
    };

    const data = await this.fetch<FlatOrderDetailResponse>(`/api/orders/${orderId}`);
    const items = data.items.map((item) => {
      const price = parseFloat(String(item.price));
      return {
        id: item.product_id ?? 0,
        productId: item.product_id ?? 0,
        productName: item.product_name,
        productImage: undefined,
        price: String(price),
        quantity: item.quantity,
        subtotal: String(price * item.quantity),
      };
    });
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const totalAmount = parseFloat(String(data.total_amount));
    const shippingCost = Math.max(0, totalAmount - subtotal);

    return {
      order: {
        id: data.id,
        orderNumber: `#${data.id}`,
        status: data.status,
        paymentStatus: "paid",
        paymentMethod: undefined,
        paymentReference: undefined,
        total: String(totalAmount),
        subtotal: String(subtotal.toFixed(2)),
        shippingCost: String(shippingCost.toFixed(2)),
        shippingFullName: "",
        shippingAddress: data.shipping_address,
        shippingCity: "",
        shippingPostalCode: undefined,
        shippingCountry: "",
        shippingPhone: "",
        deliveryOtp: undefined,
        createdAt: data.created_at,
        updatedAt: data.created_at,
      },
      items,
      history: [],
      payment: { transactionId: undefined },
    };
  }

  async getAddresses(): Promise<Address[]> {
    return this.fetch<Address[]>("/api/addresses");
  }

  async createAddress(address: Omit<Address, 'id'>): Promise<Address> {
    return this.fetch<Address>("/api/addresses", {
      method: "POST",
      body: JSON.stringify(address),
    });
  }

  async deleteAddress(addressId: number): Promise<void> {
    await this.fetch(`/api/addresses/${addressId}`, { method: "DELETE" });
  }

  async getWishlist(): Promise<WishlistItem[]> {
    return this.fetch<WishlistItem[]>("/api/wishlist");
  }

  async cancelOrder(orderId: number, reason: string): Promise<void> {
        await this.fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ orderNumber: orderId, reason }),
    });
  }

  async syncCart(items: { productId: number; quantity: number }[]): Promise<void> {
    await this.fetch("/api/cart/sync", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(i => ({ product_id: i.productId, quantity: i.quantity }))
        }),
    });
  }

  async getPublicSettings(): Promise<PublicSettings> {
    return this.fetch<PublicSettings>("/api/settings/public?keys=appearance,general");
  }

  calculateStats(orders: Order[]): DashboardStats {
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => ["pending", "processing"].includes(o.status)).length,
      deliveredOrders: orders.filter((o) => o.status === "delivered").length,
      totalSpent: orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
    };
  }
}

export const dashboardService = new DashboardService();