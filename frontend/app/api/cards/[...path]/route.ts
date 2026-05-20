export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(request: Request) {
  console.log("[api/cards/[...path]] GET", request.url);
  return proxyToCatalogue(request);
}

export async function POST(request: Request) {
  console.log("[api/cards/[...path]] POST", request.url);
  return proxyToCatalogue(request);
}

export async function PUT(request: Request) {
  console.log("[api/cards/[...path]] PUT", request.url);
  return proxyToCatalogue(request);
}

export async function PATCH(request: Request) {
  console.log("[api/cards/[...path]] PATCH", request.url);
  return proxyToCatalogue(request);
}

export async function DELETE(request: Request) {
  console.log("[api/cards/[...path]] DELETE", request.url);
  return proxyToCatalogue(request);
}
