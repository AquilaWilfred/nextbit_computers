export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

export async function GET(request: Request) {
  console.log("[api/admin/cards/[...path]] GET", request.url);
  return proxyToGateway(request);
}

export async function POST(request: Request) {
  console.log("[api/admin/cards/[...path]] POST", request.url);
  return proxyToGateway(request);
}

export async function PUT(request: Request) {
  console.log("[api/admin/cards/[...path]] PUT", request.url);
  return proxyToGateway(request);
}

export async function PATCH(request: Request) {
  console.log("[api/admin/cards/[...path]] PATCH", request.url);
  return proxyToGateway(request);
}

export async function DELETE(request: Request) {
  console.log("[api/admin/cards/[...path]] DELETE", request.url);
  return proxyToGateway(request);
}
