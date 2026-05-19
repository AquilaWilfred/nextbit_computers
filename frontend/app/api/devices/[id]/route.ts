import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Proxy to Axum gateway
    const gatewayUrl = process.env.AXUM_GATEWAY_URL || "http://127.0.0.1:8080";
    const response = await fetch(`${gatewayUrl}/api/devices/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}