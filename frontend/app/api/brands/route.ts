import { NextRequest, NextResponse } from "next/server";

const CATALOGUE = process.env.CATALOGUE_URL ?? "http://localhost:8001";

export async function GET(req: NextRequest) {
  const res = await fetch(`${CATALOGUE}/api/admin/settings/brands`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${CATALOGUE}/api/admin/settings/brands`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: body }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}