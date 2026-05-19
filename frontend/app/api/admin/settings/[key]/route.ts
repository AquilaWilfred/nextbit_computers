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
    const response = await fetchBackend(`/admin/settings/${key}`, {
      method: "GET",
    });

    if (response.ok) {
      const value = await response.json();
      writeAdminSetting(key, value);
      return NextResponse.json(value);
    }
  } catch {
    // Fall back to local in-memory settings during migration/dev.
  }

  return NextResponse.json(readAdminSetting(key));
}

async function writeSetting(request: NextRequest, context: Context) {
  const { key } = await context.params;
  const body = await request.json().catch(() => ({}));
  const value = body?.value ?? body ?? {};

  try {
    const response = await fetchBackend(`/admin/settings/${key}`, {
      method: request.method,
      body: JSON.stringify({ value }),
    });

    if (response.ok) {
      const saved = await response.json();
      writeAdminSetting(key, saved);
      return NextResponse.json(saved);
    }
  } catch {
    // Fall back to local in-memory settings during migration/dev.
  }

  return NextResponse.json(writeAdminSetting(key, value));
}

export async function PUT(request: NextRequest, context: Context) {
  return writeSetting(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return writeSetting(request, context);
}
