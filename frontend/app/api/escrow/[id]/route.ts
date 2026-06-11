export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  return proxyToGateway(request, `/api/escrow/${escrowId}`);
}
