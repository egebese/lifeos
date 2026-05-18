import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth/session";
import { exchangeCode, saveTokens } from "@/lib/whoop/oauth";

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expected = jar.get("lt_whoop_state")?.value;
  if (!code || !state || !expected || expected !== state) {
    return NextResponse.json({ error: "state_mismatch" }, { status: 400 });
  }
  jar.delete("lt_whoop_state");

  try {
    const tok = await exchangeCode(code);
    await saveTokens(ctx.user.id, tok);
    return NextResponse.redirect(new URL("/whoop?connected=1", req.url));
  } catch (e) {
    return NextResponse.json({ error: "exchange_failed", detail: String(e) }, { status: 500 });
  }
}
