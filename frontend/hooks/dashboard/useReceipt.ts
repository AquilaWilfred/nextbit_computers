import { OrderDetail, PublicSettings } from "@/types/dashboard/dashboard.types";
import { formatPrice } from "@/lib/cart";
import { toast } from "sonner";

export function useReceipt() {
  const generateReceipt = (orderDetail: OrderDetail, settings: PublicSettings | null, userEmail?: string) => {
    const { order, items, payment } = orderDetail;
    const storeName = (settings?.general?.storeName as string) || "Store";
    const logoUrl = settings?.appearance?.logoUrl;
    const address = (settings?.general?.address as string) || "123 Innovation Drive";
    const email = (settings?.general?.contactEmail as string) || "support@company.com";
    const tagline = (settings?.general?.heroTitle as string) || "Premium Tech";

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Please allow popups to print receipts");
      return;
    }

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
            ${userEmail ?? ""}
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

  return { generateReceipt };
}