import { NextRequest } from "next/server";
import { getUpload, putUpload } from "@/lib/upload-store";

type Context = {
  params: Promise<{ key: string[] }>;
};

function joinKey(parts: string[]): string {
  return parts.join("/");
}

export async function PUT(request: NextRequest, context: Context) {
  const { key } = await context.params;
  const arrayBuffer = await request.arrayBuffer();
  putUpload(
    joinKey(key),
    new Uint8Array(arrayBuffer),
    request.headers.get("content-type") || "application/octet-stream"
  );

  return new Response(null, { status: 200 });
}

export async function GET(_request: NextRequest, context: Context) {
  const { key } = await context.params;
  const upload = getUpload(joinKey(key));

  if (!upload) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(upload.body, {
    status: 200,
    headers: {
      "Content-Type": upload.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
