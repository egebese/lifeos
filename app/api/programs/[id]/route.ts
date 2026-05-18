import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { programs } from "@/lib/db/schema";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
});

async function ensureOwned(userId: string, id: string) {
  const [row] = await db
    .select({ id: programs.id, userId: programs.userId, isTemplate: programs.isTemplate })
    .from(programs)
    .where(eq(programs.id, id))
    .limit(1);
  if (!row) return { ok: false as const, status: 404, error: "not_found" };
  if (row.isTemplate || row.userId !== userId) {
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
  const check = await ensureOwned(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const updates: Partial<{ name: string; description: string | null }> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }
  await db.update(programs).set(updates).where(eq(programs.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const check = await ensureOwned(user.id, id);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  // Cascade on programs row deletes program_days → program_exercises (FK on
  // delete cascade). Linked workouts have ON DELETE SET NULL so they stay.
  await db
    .delete(programs)
    .where(and(eq(programs.id, id), eq(programs.userId, user.id)));
  return NextResponse.json({ ok: true });
}
