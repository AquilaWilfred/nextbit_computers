export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(r: Request) {
  return proxyToCatalogue(r, "/api/admin/branches");
}

export async function POST(r: Request) {
  return proxyToCatalogue(r, "/api/admin/branches");
}