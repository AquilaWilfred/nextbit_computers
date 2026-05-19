import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const filename =
    typeof body?.filename === "string" && body.filename.trim()
      ? body.filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
      : "upload.bin";

  const key = `${Date.now()}-${randomUUID()}-${filename}`;

  return NextResponse.json({
    uploadUrl: `/api/uploads/object/${key}`,
    publicUrl: `/api/uploads/object/${key}`,
  });
}
