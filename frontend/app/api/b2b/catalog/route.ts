import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/b2b/catalog`, {
      headers: {
        "Cookie": request.headers.get("cookie") || "",
      },
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      return NextResponse.json({ error }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Catalog fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}