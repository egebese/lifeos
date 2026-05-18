import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { syncAll } from "@/lib/whoop/sync";

const MAX_DAYS = 365 * 2;

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? "30");
  const sinceDays = Math.max(
    1,
    Math.min(MAX_DAYS, Number.isFinite(daysParam) ? Math.round(daysParam) : 30),
  );
  try {
    const result = await syncAll(ctx.user.id, sinceDays);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
