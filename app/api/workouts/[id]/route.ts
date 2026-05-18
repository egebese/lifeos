import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workouts } from "@/lib/db/schema";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  await db
    .update(workouts)
    .set({ endedAt: new Date() })
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  return NextResponse.json({ ok: true });
}
