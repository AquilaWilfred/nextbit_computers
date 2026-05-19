import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
import {
  readAdminSetting,
  writeAdminSetting,
} from "@/lib/admin-settings-store";

type Context = {
  params: Promise<{ key: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
  const { key } = await context.params;
  try {
    const response = await fetchBackend(`/settings/${key}`, { method: "GET" });
    if (response.ok) {
      const json = await response.json();
      // Backend returns { key, value } — extract value
      const value = json?.value ?? json;
      writeAdminSetting(key, value);
      return NextResponse.json({ key, value });
    }
  } catch {
    // fall through to local cache
  }
  return NextResponse.json({ key, value: readAdminSetting(key) });
}

export async function PUT(request: NextRequest, context: Context) {
  const { key } = await context.params;
  const body = await request.json().catch(() => ({}));
  const value = body?.value ?? body;
  try {
    const response = await fetchBackend(`/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
    if (response.ok) {
      const json = await response.json();
      const saved = json?.value ?? json;
      writeAdminSetting(key, saved);
      return NextResponse.json({ key, value: saved });
    }
  } catch {
    // fall through to local cache
  }
  const saved = writeAdminSetting(key, value);
  return NextResponse.json({ key, value: saved });
}
