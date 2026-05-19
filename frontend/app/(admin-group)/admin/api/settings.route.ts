/**
 * REST API routes for settings.
 *
 * GET  /api/settings/:key   → fetch one setting
 * PUT  /api/settings/:key   → save one setting (broadcasts via WS)
 *
 * POST /api/uploads/presign → get an S3 presigned upload URL
 * GET  /api/admin/export-database → full DB export for backup
 *
 * WebSocket: /ws/settings   → real-time setting sync across tabs/devices
 *
 * ─── File layout (Next.js App Router) ────────────────────────────────────────
 *
 *   app/api/settings/[key]/route.ts   ← GET + PUT (this file's pattern)
 *   app/api/uploads/presign/route.ts  ← POST
 *   app/api/admin/export-database/route.ts ← GET
 *   app/api/ws/settings/route.ts      ← WebSocket upgrade (see note below)
 *
 * ─── WebSocket note ───────────────────────────────────────────────────────────
 * Next.js App Router does not natively support WebSocket upgrades.
 * Options (pick one):
 *
 *   A) Custom server (server.ts):
 *      Use the `ws` npm package alongside your Next.js server. On each
 *      PUT /api/settings/:key, the REST handler calls a shared
 *      broadcastSettingUpdate(key, value) function that fans out to all
 *      connected WebSocket clients.
 *
 *   B) Server-Sent Events (SSE) as a simpler alternative:
 *      GET /api/settings/stream → text/event-stream
 *      Each PUT broadcasts an SSE event. The client-side WS class in
 *      useSettings.ts can trivially be swapped for an EventSource.
 *
 *   C) Third-party (Pusher, Ably, Supabase Realtime):
 *      Replace the SettingsWebSocket singleton with the provider's SDK.
 *
 * The REST layer is fully functional without WebSockets; real-time sync
 * is purely additive.
 */

// ─── app/api/settings/[key]/route.ts ──────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";               // your DB client
import { broadcastSettingUpdate } from "../../../../lib/ws-broadcast"; // see note above

type Params = { params: { key: string } };

/** Validate that the key is a known setting. */
const VALID_KEYS = new Set([
  "general", "appearance", "payment", "shipping",
  "email", "security", "social", "backup",
]);

function validateKey(key: string): key is string {
  return VALID_KEYS.has(key);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { key } = params;
  if (!validateKey(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  try {
    const row = await db.setting.findUnique({ where: { key } });
    // Return empty object when not yet configured so the client uses defaults
    return NextResponse.json(
      { key, value: row?.value ?? {} },
      {
        headers: {
          // Short-lived cache; CDN can serve stale for 30s while revalidating
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/settings/:key]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { key } = params;
  if (!validateKey(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  let body: { value: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const row = await db.setting.upsert({
      where: { key },
      create: { key, value: body.value as any },
      update: { value: body.value as any },
    });

    // Broadcast to all WebSocket clients so other tabs/devices update live
    broadcastSettingUpdate(key, body.value);

    return NextResponse.json({ key, value: row.value }, { status: 200 });
  } catch (err) {
    console.error("[PUT /api/settings/:key]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── app/api/uploads/presign/route.ts ─────────────────────────────────────────
/*
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl });
}
*/

// ─── lib/ws-broadcast.ts (custom server pattern) ──────────────────────────────
/*
import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;

export function getWss(server: any) {
  if (!wss) {
    wss = new WebSocketServer({ server, path: "/ws/settings" });
    wss.on("connection", (ws) => {
      ws.on("error", console.error);
    });
  }
  return wss;
}

export function broadcastSettingUpdate(key: string, value: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ type: "settings_updated", key, value });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
*/