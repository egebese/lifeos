import { NextRequest, NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  exercises,
  programDays,
  programExercises,
  programs,
} from "@/lib/db/schema";

const Body = z.object({
  exerciseId: z.string().min(1).max(40),
  targetSets: z.coerce.number().int().min(1).max(20).optional(),
  targetReps: z.coerce.number().int().min(1).max(200).optional(),
  targetWeightKg: z.coerce.number().nonnegative().max(1000).optional(),
  notes: z.string().max(240).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id: dayId } = await params;

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
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.isTemplate || row.programUserId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Reject unknown exercise IDs so we don't store dangling FKs.
  const [exists] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.id, parsed.data.exerciseId))
    .limit(1);
  if (!exists) {
    return NextResponse.json({ error: "exercise_not_found" }, { status: 404 });
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(programExercises.orderIndex) })
    .from(programExercises)
    .where(eq(programExercises.programDayId, dayId));
  const nextOrder = (maxOrder ?? -1) + 1;

  const [inserted] = await db
    .insert(programExercises)
    .values({
      programDayId: dayId,
      exerciseId: parsed.data.exerciseId,
      orderIndex: nextOrder,
      targetSets: parsed.data.targetSets ?? null,
      targetReps: parsed.data.targetReps ?? null,
      targetWeightKg:
        parsed.data.targetWeightKg != null
          ? String(parsed.data.targetWeightKg)
          : null,
      notes: parsed.data.notes ?? null,
    })
    .returning({ id: programExercises.id });

  return NextResponse.json({ id: inserted.id, orderIndex: nextOrder });
}
