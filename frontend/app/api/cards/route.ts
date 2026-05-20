export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(request: Request) {
  console.log("[api/cards] GET", request.url);
  return proxyToCatalogue(request);
}

export async function POST(request: Request) {
  console.log("[api/cards] POST", request.url);
  return proxyToCatalogue(request);
}

export async function PUT(request: Request) {
  console.log("[api/cards] PUT", request.url);
  return proxyToCatalogue(request);
}

export async function PATCH(request: Request) {
  console.log("[api/cards] PATCH", request.url);
  return proxyToCatalogue(request);
}

export async function DELETE(request: Request) {
  console.log("[api/cards] DELETE", request.url);
  return proxyToCatalogue(request);
}
