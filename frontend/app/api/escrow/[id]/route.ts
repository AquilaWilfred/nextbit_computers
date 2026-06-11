export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const escrowId = params.id;
  return proxyToGateway(request, `/api/escrow/${escrowId}`);
}
