export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

export async function GET(request: Request) {
  console.log("[api/mywallet] GET", request.url);
  return proxyToGateway(request);
}

export async function POST(request: Request) {
  console.log("[api/mywallet] POST", request.url);
  return proxyToGateway(request);
}
