export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";
export async function POST(r: Request) {
  return proxyToCatalogue(r, "/api/orders/paypal/confirm");
}
