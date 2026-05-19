import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  locale: z.enum(["en", "tr"]),
});

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  await db
    .update(users)
    .set({ locale: parsed.data.locale })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
