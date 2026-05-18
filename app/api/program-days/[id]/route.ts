import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { programDays, programs } from "@/lib/db/schema";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  dayIndex: z.number().int().min(0).max(50).optional(),
});

async function ensureOwnedDay(userId: string, dayId: string) {
  const [row] = await db
    .select({
      dayId: programDays.id,
      programId: programDays.programId,
      programUserId: programs.userId,
      isTemplate: programs.isTemplate,
    })
    .from(programDays)
    .innerJoin(programs, eq(programs.id, programDays.programId))
    .where(eq(programDays.id, dayId))
    .limit(1);
  if (!row) return { ok: false as const, status: 404, error: "not_found" };
  if (row.isTemplate || row.programUserId !== userId) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const check = await ensureOwnedDay(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const updates: Partial<{ name: string; dayIndex: number }> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.dayIndex !== undefined) updates.dayIndex = parsed.data.dayIndex;
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  await db.update(programDays).set(updates).where(eq(programDays.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const check = await ensureOwnedDay(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  await db.delete(programDays).where(eq(programDays.id, id));
  return NextResponse.json({ ok: true });
}
