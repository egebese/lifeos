"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type ProgramOpt = { id: string; name: string };

export function NewWorkoutForm({ programs }: { programs: ProgramOpt[] }) {
  const t = useT();
  const router = useRouter();
  const { update } = useDemoStore();
  const [programId, setProgramId] = useState<string>(programs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  function start() {
    setBusy(true);
    const id = generateId();
    update((prev) => ({
      workouts: [
        {
          id,
          userId: DEMO_USER_ID,
          programId: programId || null,
          programDayId: null,
          startedAt: new Date(),
          endedAt: null,
          notes: null,
          source: "manual",
        },
        ...prev.workouts,
      ],
    }));
    router.push(`/workouts/${id}`);
  }

  return (
    <div className="space-y-4 mt-2">
      <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
        <option value="">{t("common.freeNoProgram")}</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <div className="flex justify-end">
        <Button onClick={start} disabled={busy} variant="accent">
          {busy ? t("common.busy") : t("common.startButton")}
        </Button>
      </div>
    </div>
  );
}
