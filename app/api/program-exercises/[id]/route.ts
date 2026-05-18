import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { programDays, programExercises, programs } from "@/lib/db/schema";

const PatchBody = z.object({
  targetSets: z.coerce.number().int().min(1).max(20).nullable().optional(),
  targetReps: z.coerce.number().int().min(1).max(200).nullable().optional(),
  targetWeightKg: z.coerce.number().nonnegative().max(1000).nullable().optional(),
  notes: z.string().max(240).nullable().optional(),
  orderIndex: z.coerce.number().int().min(0).max(100).optional(),
});

async function ensureOwnedExercise(userId: string, exId: string) {
  const [row] = await db
    .select({
      exId: programExercises.id,
      programUserId: programs.userId,
      isTemplate: programs.isTemplate,
    })
    .from(programExercises)
    .innerJoin(programDays, eq(programDays.id, programExercises.programDayId))
    .innerJoin(programs, eq(programs.id, programDays.programId))
    .where(eq(programExercises.id, exId))
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
  const check = await ensureOwnedExercise(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Partial<{
    targetSets: number | null;
    targetReps: number | null;
    targetWeightKg: string | null;
    notes: string | null;
    orderIndex: number;
  }> = {};
  if (parsed.data.targetSets !== undefined) updates.targetSets = parsed.data.targetSets;
  if (parsed.data.targetReps !== undefined) updates.targetReps = parsed.data.targetReps;
  if (parsed.data.targetWeightKg !== undefined) {
    updates.targetWeightKg =
      parsed.data.targetWeightKg != null ? String(parsed.data.targetWeightKg) : null;
  }
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.orderIndex !== undefined) updates.orderIndex = parsed.data.orderIndex;
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  await db.update(programExercises).set(updates).where(eq(programExercises.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const check = await ensureOwnedExercise(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  await db.delete(programExercises).where(eq(programExercises.id, id));
  return NextResponse.json({ ok: true });
}
