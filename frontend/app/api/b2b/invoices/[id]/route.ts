import { NextRequest, NextResponse } from "next/server";

const isValidInvoiceId = (id?: string | string[] | null): id is string =>
  typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null";

export async function GET(
  request: NextRequest,
  context: any
) {
  if (!isValidInvoiceId(context.params?.id)) {
    return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const isPdf = url.searchParams.get("pdf") === "true";

    const endpoint = isPdf
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/b2b/invoices/${context.params.id}/pdf`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/b2b/invoices/${context.params.id}`;

    const backendResponse = await fetch(endpoint, {
      headers: {
        "Cookie": request.headers.get("cookie") || "",
      },
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      return NextResponse.json({ error }, { status: backendResponse.status });
    }

    if (isPdf) {
      const blob = await backendResponse.blob();
      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${context.params.id}.pdf"`,
        },
      });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}