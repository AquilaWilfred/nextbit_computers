import { useCallback } from "react";
import { toast } from "sonner";
import { OrderDetail, PublicSettings } from "@/types/orders.types";
import { apiFetch } from "@/lib/utils/order.utils";
import { formatPrice } from "@/lib/cart";

export function useInvoice(settings: PublicSettings) {
  const generateInvoice = useCallback(
    async (orderId: number) => {
      try {
        const data = await apiFetch<OrderDetail>(`/api/admin/orders/${orderId}/detail`);
        if (!data?.order) return toast.error("Could not load order details");

        const { order, items, customer, payment } = data;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return toast.error("Please allow popups to print invoices");

        const storeName = settings?.general?.storeName || "Store";
        const logoUrl = settings?.appearance?.logoUrl;
        const address = settings?.general?.address || "123 Innovation Drive, Suite 100";
        const contactEmail = settings?.general?.contactEmail || "support@company.com";
        const heroTitle = settings?.general?.heroTitle || "Premium Tech, Exceptional Performance";
        const heroDescription = settings?.general?.heroDescription || "";

        const logoHtml = logoUrl
          ? `<img src="${logoUrl}" alt="${storeName}" style="max-height:40px;max-width:150px;margin-bottom:4px;" />`
          : `<h2 style="margin:0 0 4px 0;font-size:20px;">${storeName}</h2>`;

        const invoiceHtml = generateInvoiceHtml({
          order,
          items,
          customer,
          payment,
          logoHtml,
          address,
          contactEmail,
          heroTitle,
          heroDescription,
          storeName,
        });

        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
      } catch (err: any) {
        toast.error(err.message || "Failed to generate invoice");
      }
    },
    [settings]
  );

  return { generateInvoice };
}

function generateInvoiceHtml(data: any): string {
  const { order, items, customer, payment, logoHtml, address, contactEmail, heroTitle, heroDescription } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice #${order.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body{font-family:'Inter',system-ui,sans-serif;color:#1f2937;max-width:800px;margin:0 auto;padding:20px;line-height:1.5;}
    .invoice-container{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px 30px;box-shadow:0 4px 6px -1px rgba(0,0,0,.05);}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #f3f4f6;padding-bottom:15px;margin-bottom:20px;}
    .invoice-title{font-size:24px;font-weight:800;color:#111827;letter-spacing:-.025em;margin:0;}
    .invoice-number{color:#6b7280;font-size:16px;margin-top:4px;}
    .store-info p{color:#6b7280;font-size:13px;margin:4px 0 0 0;}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:8px;}
    .section-title{font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;letter-spacing:.05em;margin-bottom:8px;}
    .details-text{font-size:13px;color:#374151;}
    .details-text strong{color:#111827;font-weight:600;}
    table{width:100%;border-collapse:separate;border-spacing:0;margin-bottom:20px;}
    th{text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
    td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;}
    .text-right{text-align:right;}
    .totals{width:280px;margin-left:auto;background:#f9fafb;padding:16px;border-radius:8px;}
    .totals-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#4b5563;}
    .totals-row.bold{font-weight:700;font-size:16px;color:#111827;border-top:2px solid #e5e7eb;padding-top:10px;margin-top:6px;}
    .badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;}
    .badge-paid{background:#d1fae5;color:#065f46;}
    .badge-pending{background:#fef3c7;color:#92400e;}
  </style>
</head>
<body onload="window.print();">
  <div class="invoice-container">
    <div class="header">
      <div><div class="invoice-title">INVOICE</div><div class="invoice-number">#${order.orderNumber}</div></div>
      <div class="text-right store-info">${logoHtml}<p>${address.replace(/,/g, "<br/>")}<br/>${contactEmail}</p></div>
    </div>
    <div class="details">
      <div>
        <div class="section-title">Billed To</div>
        <div class="details-text">
          <strong>${order.shippingFullName}</strong><br/>
          ${order.shippingAddress}<br/>
          ${order.shippingCity}${order.shippingPostalCode ? ", " + order.shippingPostalCode : ""}<br/>
          ${order.shippingCountry}<br/>
          ${order.shippingPhone}<br/>
          ${customer?.email || ""}
        </div>
      </div>
      <div class="text-right">
        <div class="section-title">Order Details</div>
        <div class="details-text">
          Date: <strong>${new Date(order.createdAt).toLocaleDateString()}</strong><br/>
          Status: <strong>${order.status.replace(/_/g, " ").toUpperCase()}</strong><br/>
          Method: <strong>${order.paymentMethod ? order.paymentMethod.toUpperCase() : "N/A"}</strong><br/>
          ${payment?.transactionId || order.paymentReference ? `Transaction ID: <strong style="font-family:monospace;font-size:12px;word-break:break-all;">${payment?.transactionId || order.paymentReference}</strong><br/>` : ""}
          <div style="margin-top:8px;"><span class="badge ${order.paymentStatus === "paid" ? "badge-paid" : "badge-pending"}">${order.paymentStatus}</span></div>
        </div>
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th class="text-right">Price</th><th class="text-right">Qty</th><th class="text-right">Total</th></tr></thead>
      <tbody>${items.map((item: any) => `
        <tr>
          <td><strong>${item.productName}</strong></td>
          <td class="text-right">${formatPrice(item.price)}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatPrice(item.subtotal)}</td>
        </tr>
      `).join("")}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
      <div class="totals-row"><span>Shipping</span><span>${formatPrice(order.shippingCost)}</span></div>
      <div class="totals-row bold"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    </div>
    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 4px 0;">${heroTitle}</p>
      <p style="font-size:12px;color:#6b7280;margin:0;">${heroDescription}</p>
    </div>
  </div>
</body>
</html>`;
}