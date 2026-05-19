import { NextRequest, NextResponse } from "next/server";
const CATALOGUE = process.env.CATALOGUE_URL ?? "http://localhost:8001";

let cache: { data: unknown; ts: number } | null = null;
const TTL = 60_000; // 1 minute

export async function GET(req: NextRequest) {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }
  const res = await fetch(`${CATALOGUE}/api/categories/`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  cache = null; // invalidate on write
  const body = await req.json();
  const res = await fetch(`${CATALOGUE}/api/categories/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
