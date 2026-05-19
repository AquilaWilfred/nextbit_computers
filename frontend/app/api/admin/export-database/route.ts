import { NextResponse } from "next/server";
import { getAdminSettingsStore } from "@/lib/admin-settings-store";

export async function GET() {
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    source: "next-admin-compat",
    settings: getAdminSettingsStore(),
  });
}
