"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useDemoStore } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";

export function DeleteProgramButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const router = useRouter();
  const { update } = useDemoStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function doDelete() {
    setBusy(true);
    update((prev) => {
      const removedDayIds = new Set(
        prev.programDays.filter((d) => d.programId === programId).map((d) => d.id),
      );
      return {
        programs: prev.programs.filter((p) => p.id !== programId),
        programDays: prev.programDays.filter((d) => d.programId !== programId),
        programExercises: prev.programExercises.filter(
          (pe) => !removedDayIds.has(pe.programDayId),
        ),
      };
    });
    router.push("/programs");
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`delete ${programName}`}
      >
        <Trash2 size={14} strokeWidth={1.5} className="mr-2" />
        DELETE
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
        SURE?
      </span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        CANCEL
      </Button>
      <Button variant="danger" size="sm" onClick={doDelete} disabled={busy}>
        {busy ? "DELETING…" : "YES, DELETE"}
      </Button>
    </div>
  );
}
