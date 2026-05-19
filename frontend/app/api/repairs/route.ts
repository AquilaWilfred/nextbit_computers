export const runtime = "nodejs";
import { proxyToCatalogue } from "@/lib/proxy";

export async function GET(request: Request) {
  return proxyToCatalogue(request);
}

export async function POST(request: Request) {
  return proxyToCatalogue(request);
}

export async function PUT(request: Request) {
  return proxyToCatalogue(request);
}

export async function PATCH(request: Request) {
  return proxyToCatalogue(request);
}

export async function DELETE(request: Request) {
  return proxyToCatalogue(request);
}
