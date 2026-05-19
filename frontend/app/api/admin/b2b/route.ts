import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? "http://127.0.0.1:8080";

async function handler(req: NextRequest) {
  const segments = req.nextUrl.pathname
    .replace(/^\/api\/admin\/b2b\/?/, "")
    .split("/")
    .filter(Boolean);
  const path = segments.join("/");
  const upstream = `${GATEWAY}/api/admin/b2b${path ? `/${path}` : ""}${req.nextUrl.search}`;

  // Forward the HttpOnly auth cookie set by Axum on login
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("nextbit_token");

  const headers = new Headers(req.headers);
  headers.delete("host");
  if (authCookie) headers.set("cookie", `nextbit_token=${authCookie.value}`);

  const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD"
      ? isMultipart ? req.body : await req.text()
      : undefined,
    // @ts-expect-error — Node 18 fetch supports this
    duplex: isMultipart ? "half" : undefined,
  });

  const resHeaders = new Headers(upstreamRes.headers);
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