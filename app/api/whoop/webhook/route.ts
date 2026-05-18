import { NextRequest, NextResponse } from "next/server";
import { verifyWhoopSignature } from "@/lib/whoop/webhook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Whoop signs webhooks with the OAuth client_secret; a separate WHOOP_WEBHOOK_SECRET
  // is optional. Prefer the dedicated one if provided, else fall back to client_secret.
  const secret = process.env.WHOOP_WEBHOOK_SECRET || process.env.WHOOP_CLIENT_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-whoop-signature");
  const timestamp = req.headers.get("x-whoop-signature-timestamp");

  if (!verifyWhoopSignature({ rawBody: raw, signature, timestamp, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // We intentionally don't trigger a sync per event here (single-admin app).
  // Periodic sync via cron + manual sync covers it; webhook events go to logs.
  try {
    const event = JSON.parse(raw);
    console.log("[whoop webhook]", event?.type ?? "?", event?.id ?? "?");
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
