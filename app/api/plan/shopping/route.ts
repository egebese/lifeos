import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { mealPlans, shoppingLists } from "@/lib/db/schema";

export const runtime = "nodejs";

const ItemSchema = z.object({
  name: z.string(),
  qty: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  aisle: z.string().optional(),
  checked: z.boolean().optional(),
});

const Body = z.object({
  shoppingListId: z.string().uuid(),
  items: z.array(ItemSchema),
});

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { shoppingListId, items } = parsed.data;

  // Ownership check: list must belong to one of the user's meal plans.
  const [row] = await db
    .select({
      id: shoppingLists.id,
      mealPlanUserId: mealPlans.userId,
    })
    .from(shoppingLists)
    .innerJoin(mealPlans, eq(mealPlans.id, shoppingLists.mealPlanId))
    .where(and(eq(shoppingLists.id, shoppingListId), eq(mealPlans.userId, user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .update(shoppingLists)
    .set({ items })
    .where(eq(shoppingLists.id, shoppingListId));

  return NextResponse.json({ ok: true });
}
