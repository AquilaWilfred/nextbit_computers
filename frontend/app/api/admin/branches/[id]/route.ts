export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { proxyToCatalogue } from "@/lib/proxy";

export async function PUT(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/branches/${context.params.id}`);
}

export async function DELETE(request: NextRequest, context: any) {
  return proxyToCatalogue(request, `/api/admin/branches/${context.params.id}`);
}
