import crypto from "crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080";
const PLATFORM_SELLER_ID = process.env.PLATFORM_SELLER_ID!; // NextBit admin openId

async function cloneHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.set("content-type", "application/json");

  const cookieStore = await cookies();
  const authCookie = cookieStore.get("nextbit_token");
  if (authCookie) {
    headers.set("cookie", `nextbit_token=${authCookie.value}`);
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return headers;
}

function stableUuidFromString(value: string) {
  const hash = crypto.createHash("sha1").update("nextbit-order-id:").update(value).digest();
  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return `${bytes.toString("hex", 0, 4)}-${bytes.toString("hex", 4, 6)}-${bytes.toString("hex", 6, 8)}-${bytes.toString("hex", 8, 10)}-${bytes.toString("hex", 10, 16)}`;
}

export async function POST(request: Request) {
  const body = await request.json();

  const orderId    = typeof body.orderId === "string" ? body.orderId : String(body.orderId);
  const amount     = Number(body.amount);
  const currency   = body.currency ?? "KES";
  const buyerPhone = body.buyerPhone as string;

  // sellerId / sellerOpenId comes from place-order response:
  //   - string when buyer bought a trade-in listing (individual seller)
  //   - null when buyer bought a product (NextBit sells → use PLATFORM_SELLER_ID)
  const sellerIdentifier = Object.prototype.hasOwnProperty.call(body, "sellerId")
    ? body.sellerId
    : body.sellerOpenId;

  if (!Object.prototype.hasOwnProperty.call(body, "sellerId") && !Object.prototype.hasOwnProperty.call(body, "sellerOpenId")) {
    return Response.json({ error: "sellerId or sellerOpenId is required" }, { status: 400 });
  }

  if (sellerIdentifier !== null && typeof sellerIdentifier !== "string") {
    return Response.json(
      { error: "sellerId or sellerOpenId must be a string or null" },
      { status: 400 }
    );
  }

  const sellerId = sellerIdentifier === null ? PLATFORM_SELLER_ID : sellerIdentifier;

  if (!sellerId) {
    return Response.json(
      { error: "Seller could not be determined. Contact support." },
      { status: 500 }
    );
  }

  if (!buyerPhone) {
    return Response.json({ error: "buyerPhone is required" }, { status: 400 });
  }

  // Step 1 — Create escrow
  const escrowResponse = await fetch(`${GATEWAY}/api/escrow`, {
    method: "POST",
    headers: await cloneHeaders(request),
    body: JSON.stringify({
      order_id:  stableUuidFromString(orderId),
      seller_id: sellerId,
      amount,
      currency,
    }),
  });

  const escrowText = await escrowResponse.text();
  if (!escrowResponse.ok) {
    return new Response(escrowText, {
      status: escrowResponse.status,
      headers: { "Content-Type": escrowResponse.headers.get("content-type") ?? "text/plain" },
    });
  }

  const escrow = JSON.parse(escrowText);

  // Step 2 — Initiate Daraja STK push
  const darajaResponse = await fetch(`${GATEWAY}/api/escrow/${escrow.id}/daraja/pay`, {
    method: "POST",
    headers: await cloneHeaders(request),
    body: JSON.stringify({
      buyer_phone: buyerPhone,
      escrow_id:   escrow.id,
    }),
  });

  const darajaText = await darajaResponse.text();
  if (!darajaResponse.ok) {
    return new Response(darajaText, {
      status: darajaResponse.status,
      headers: { "Content-Type": darajaResponse.headers.get("content-type") ?? "text/plain" },
    });
  }

  const darajaResult = JSON.parse(darajaText);
  return new Response(JSON.stringify({ ...escrow, ...darajaResult }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}