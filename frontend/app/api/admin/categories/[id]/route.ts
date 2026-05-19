export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/categories/${context.params.id}`);
}
export async function PUT(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/categories/${context.params.id}`);
}
export async function PATCH(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/categories/${context.params.id}`);
}
export async function DELETE(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/categories/${context.params.id}`);
}
