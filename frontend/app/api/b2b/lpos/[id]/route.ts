import { NextRequest, NextResponse } from "next/server";

const isValidLpoId = (id?: string | string[] | null): id is string =>
  typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null";

export async function GET(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  if (!isValidLpoId(params?.id)) {
    return NextResponse.json({ error: "Invalid LPO ID" }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/b2b/lpos/${params.id}`, {
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
    console.error("LPO fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: any
) {
  const params = await context.params;
  if (!isValidLpoId(params?.id)) {
    return NextResponse.json({ error: "Invalid LPO ID" }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    let endpoint = `/api/b2b/lpos/${params.id}`;
    if (action === "soft-lock") {
      endpoint += "/soft-lock";
    } else if (action === "approve") {
      endpoint += "/approve";
    }

    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      method: "POST",
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
    console.error("LPO action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}