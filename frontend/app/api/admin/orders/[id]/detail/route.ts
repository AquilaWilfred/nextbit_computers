export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { proxyToCatalogue } from "@/lib/proxy";
export async function GET(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/orders/${context.params.id}`);
}
