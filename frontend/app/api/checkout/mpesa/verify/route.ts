export const runtime = "nodejs";
import { proxyToGateway } from "@/lib/proxy";

// GET /api/checkout/mpesa/verify?escrowId=<uuid>
// Polls escrow state — buyer's page calls this every 5s after STK push.
// Returns the EscrowRecord JSON from the Rust gateway.

export async function GET(r: Request) {
  const { searchParams } = new URL(r.url);
  const escrowId = searchParams.get("escrowId");

  if (!escrowId) {
    return Response.json({ error: "Missing escrowId parameter" }, { status: 400 });
  }

  return proxyToGateway(r, `/api/escrow/${escrowId}`);
}