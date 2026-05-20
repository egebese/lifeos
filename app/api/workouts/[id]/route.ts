import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workouts } from "@/lib/db/schema";

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;

  const [existing] = await db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .limit(1);

  const now = new Date();
  let endedAt = now;
  if (existing?.startedAt) {
    const started = new Date(existing.startedAt);
    if (!sameLocalDay(started, now)) {
      // back-dated workout — anchor endedAt 1h after start so it stays on that day.
      endedAt = new Date(started.getTime() + 60 * 60_000);
    }
  }

  await db
    .update(workouts)
    .set({ endedAt })
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  return NextResponse.json({ ok: true });
}
