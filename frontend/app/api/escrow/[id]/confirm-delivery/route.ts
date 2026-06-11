export const runtime = "nodejs";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080";

// POST /api/escrow/:id/confirm-delivery
// Buyer confirms they received the item.
// Transitions state: funds_held_in_escrow -> delivery_confirmed

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const escrowId = params.id;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(`${GATEWAY}/api/escrow/${escrowId}/confirm-delivery`, {
    method: "POST",
    headers,
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}