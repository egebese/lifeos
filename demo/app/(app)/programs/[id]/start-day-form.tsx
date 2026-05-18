"use client";

import { useRouter } from "next/navigation";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";

export function StartDayForm({
  programId,
  programDayId,
}: {
  programId: string;
  programDayId: string;
}) {
  const router = useRouter();
  const { update } = useDemoStore();

  function start() {
    const id = generateId();
    update((prev) => ({
      workouts: [
        {
          id,
          userId: DEMO_USER_ID,
          programId,
          programDayId,
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
    <Button onClick={start} variant="accent">
      START DAY →
    </Button>
  );
}
