import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession, destroySession, createSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(256),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const ok = await verifyPassword(currentPassword, ctx.user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "wrong_current_password" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, ctx.user.id));

  // Invalidate every other session, then issue a fresh one for this device.
  await db.delete(sessions).where(eq(sessions.userId, ctx.user.id));
  await destroySession();
  await createSession({
    userId: ctx.user.id,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined,
  });

  return NextResponse.json({ ok: true });
}
