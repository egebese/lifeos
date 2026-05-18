"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { PantryForm } from "./pantry-form";
import { PantryList } from "./pantry-list";

export default function PantryPage() {
  const { state } = useDemoStore();
  const items = [...state.pantryItems].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );

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
