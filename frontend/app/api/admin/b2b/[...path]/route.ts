import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GATEWAY = process.env.AXUM_GATEWAY_URL ?? "http://127.0.0.1:8080";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join("/");
  const upstream = `${GATEWAY}/api/admin/b2b/${path}${req.nextUrl.search}`;

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
    duplex: isMultipart ? "half" : undefined,
  } as RequestInit);

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
