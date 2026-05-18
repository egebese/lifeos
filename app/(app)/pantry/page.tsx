import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pantryItems } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { PantryForm } from "./pantry-form";
import { PantryList } from "./pantry-list";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const { user } = await requireSession();
  const items = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, user.id))
    .orderBy(desc(pantryItems.updatedAt));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">INVENTORY</div>
        <h1 className="font-display text-4xl mt-1">pantry</h1>
      </header>

      <Card>
        <CardLabel>ADD ITEM</CardLabel>
        <PantryForm />
      </Card>

      <Card>
        <CardLabel>ON HAND</CardLabel>
        <PantryList
          initial={items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty ? Number(i.qty) : null,
            unit: i.unit,
          }))}
        />
      </Card>
    </div>
  );
}
