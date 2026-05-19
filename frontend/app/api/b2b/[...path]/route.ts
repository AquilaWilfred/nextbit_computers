// app/api/b2b/[...path]/route.ts
// Proxies ALL /api/b2b/* requests to the Axum gateway.
// Preserves method, headers, body (including multipart for file uploads).
// The same pattern is used for /api/admin/b2b/[...path]/route.ts — just copy this file there.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? "http://127.0.0.1:8080";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join("/");
  const prefix = req.nextUrl.pathname.startsWith("/api/admin") ? "api/admin/b2b" : "api/b2b";
  const upstream = `${GATEWAY}/${prefix}/${path}${req.nextUrl.search}`;

  // Forward the HttpOnly auth cookie set by Axum on login
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("nextbit_token");

  const headers = new Headers(req.headers);
  // Remove host so Axum doesn't reject it
  headers.delete("host");
  if (authCookie) {
    if (authCookie) headers.set("cookie", `nextbit_token=${authCookie.value}`);
  }

  // For multipart (file uploads) we stream the body directly — don't call .json()
  const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD"
      ? isMultipart ? req.body : await req.text()
      : undefined,
    // Required for streaming request body (file uploads)
    // @ts-expect-error — Node 18 fetch supports this
    duplex: isMultipart ? "half" : undefined,
  });

  const resHeaders = new Headers(upstreamRes.headers);
  // Forward Set-Cookie from Axum (login/logout flows)
  const setCookie = upstreamRes.headers.get("set-cookie");
  if (setCookie) resHeaders.set("set-cookie", setCookie);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
