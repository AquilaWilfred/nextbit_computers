import { NextRequest, NextResponse } from "next/server";
import {
  readAdminSetting,
  writeAdminSetting,
} from "@/lib/admin-settings-store";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "Missing settings key" },
      { status: 400 }
    );
  }

  const value = readAdminSetting(key);
  if (key === "brands") {
    return NextResponse.json({ brands: Array.isArray(value) ? value : [] });
  }

  return NextResponse.json({ key, value });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const key = body?.key;

  if (!key || typeof key !== "string") {
    return NextResponse.json(
      { error: "Missing settings key" },
      { status: 400 }
    );
  }

  const saved = writeAdminSetting(key, body?.value ?? {});
  if (key === "brands") {
    return NextResponse.json({ brands: Array.isArray(saved) ? saved : [] });
  }

  return NextResponse.json({ key, value: saved });
}
