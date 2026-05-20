export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(request: Request) {
  console.log('[api/ewaste] GET', request.url);
  return proxyToCatalogue(request);
}

export async function POST(request: Request) {
  console.log('[api/ewaste] POST', request.url);
  return proxyToCatalogue(request);
}

export async function PUT(request: Request) {
  console.log('[api/ewaste] PUT', request.url);
  return proxyToCatalogue(request);
}

export async function PATCH(request: Request) {
  console.log('[api/ewaste] PATCH', request.url);
  return proxyToCatalogue(request);
}

export async function DELETE(request: Request) {
  console.log('[api/ewaste] DELETE', request.url);
  return proxyToCatalogue(request);
}
