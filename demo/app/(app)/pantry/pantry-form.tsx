"use client";

import { useState } from "react";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PantryForm() {
  const { update } = useDemoStore();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const now = new Date();
      update((prev) => ({
        pantryItems: [
          {
            id: generateId(),
            userId: DEMO_USER_ID,
            name,
            qty: qty || null,
            unit: unit || null,
            expiresAt: null,
            updatedAt: now,
          },
          ...prev.pantryItems,
        ],
      }));
      setName("");
      setQty("");
      setUnit("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-3 mt-2">
      <Input placeholder="name (e.g. yulaf)" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        placeholder="qty"
        inputMode="decimal"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
      <Input
        placeholder="g | ml | adet"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      />
      <Button type="submit" disabled={busy}>
        +
      </Button>
    </form>
  );
}
