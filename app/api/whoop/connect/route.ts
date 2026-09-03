import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { requireSession, secureCookies } from "@/lib/auth/session";
import { buildAuthorizeUrl } from "@/lib/whoop/oauth";

export async function GET() {
  await requireSession();
  const state = crypto.randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set("lt_whoop_state", state, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const url = buildAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
