import { NextRequest, NextResponse } from "next/server";

async function proxy(path: string, request: NextRequest, init: RequestInit = {}) {
  try {
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/b2b/${path}`, {
      method: init.method ?? request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        "Cookie": request.headers.get("cookie") || "",
        ...init.headers,
      },
      body: init.body ?? (request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      return NextResponse.json({ error }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("LPO proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return proxy("lpos", request, { method: "GET" });
}

export async function POST(request: NextRequest) {
  return proxy("lpos", request, {
    method: "POST",
    body: await request.text(),
  });
}