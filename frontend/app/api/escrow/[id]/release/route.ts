export const runtime = "nodejs";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080";

// POST /api/escrow/:id/release
// Triggers B2C payout to seller via Daraja.
// Body: { seller_phone: "07XXXXXXXX" }

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const escrowId = params.id;

  const body = await request.json().catch(() => ({}));
  const sellerPhone = body.seller_phone ?? body.sellerPhone;

  if (!sellerPhone) {
    return Response.json({ error: "seller_phone is required" }, { status: 400 });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("content-type", "application/json");

  // Backend route: POST /api/escrow/:id/daraja/release
  const res = await fetch(`${GATEWAY}/api/escrow/${escrowId}/daraja/release`, {
    method: "POST",
    headers,
    body: JSON.stringify({ seller_phone: sellerPhone }),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}