import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { foodEntries } from "@/lib/db/schema";

const Body = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  name: z.string().min(1).optional(),
  kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  consumedAt: z.string().datetime().optional(),
});

function n(v: number | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || Number.isNaN(v)) return null;
  return String(v);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.meal !== undefined) patch.meal = v.meal;
  if (v.name !== undefined) patch.name = v.name;
  if (v.kcal !== undefined) patch.kcal = n(v.kcal);
  if (v.protein_g !== undefined) patch.proteinG = n(v.protein_g);
  if (v.carbs_g !== undefined) patch.carbsG = n(v.carbs_g);
  if (v.fat_g !== undefined) patch.fatG = n(v.fat_g);
  if (v.consumedAt !== undefined) patch.consumedAt = new Date(v.consumedAt);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const result = await db
    .update(foodEntries)
    .set(patch)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, user.id)))
    .returning({ id: foodEntries.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const result = await db
    .delete(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, user.id)))
    .returning({ id: foodEntries.id });
  if (result.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
