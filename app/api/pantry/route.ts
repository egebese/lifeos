import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { pantryItems } from "@/lib/db/schema";

const Body = z.object({
  name: z.string().min(1),
  qty: z.union([z.string(), z.number(), z.null()]).optional(),
  unit: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const qtyStr =
    v.qty === null || v.qty === undefined || v.qty === ""
      ? null
      : String(v.qty);
  const [row] = await db
    .insert(pantryItems)
    .values({
      userId: user.id,
      name: v.name,
      qty: qtyStr,
      unit: v.unit ?? null,
    })
    .returning({ id: pantryItems.id });
  return NextResponse.json({ id: row.id });
}

export async function DELETE(req: Request) {
  const { user } = await requireSession();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  await db
    .delete(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, user.id)));
  return NextResponse.json({ ok: true });
}
