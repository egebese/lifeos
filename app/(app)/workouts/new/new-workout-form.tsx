"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type ProgramOpt = { id: string; name: string };

export function NewWorkoutForm({ programs }: { programs: ProgramOpt[] }) {
  const router = useRouter();
  const [programId, setProgramId] = useState<string>(programs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ programId: programId || null }),
      });
      const data = await res.json();
      if (data?.id) router.push(`/workouts/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
        <option value="">— free / no program —</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <div className="flex justify-end">
        <Button onClick={start} disabled={busy} variant="accent">
          {busy ? "…" : "START →"}
        </Button>
      </div>
    </div>
  );
}
