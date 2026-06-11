export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

export async function POST(request: Request) {
  console.log("[api/mywallet/load] POST", request.url);
  return proxyToGateway(request);
}
